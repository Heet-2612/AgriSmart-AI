"""Weather Intelligence Service.

Deterministic, rule-based agronomic synthesis engine combining:
1. Real-time atmospheric conditions (Open-Meteo)
2. Multi-day forecast time series (Open-Meteo)
3. Seasonal climate normals (IMD)
4. Farm conditions & IoT telemetry (Soil moisture %, soil type, crop, diagnosed disease)

Produces actionable, transparent agricultural decisions without relying on generative LLMs.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import httpx
from fastapi import HTTPException, status

from app.config import settings
from app.schemas import (
    WeatherIntelligenceRequest,
    WeatherIntelligenceResponse,
    WeatherLocation,
    WeatherCurrent,
    ForecastDay,
    AgronomicAlert,
    PrimaryAction,
    SeasonalClimate,
)
from app.services.weather_service import (
    WeatherService,
    get_weather_condition,
    _default_weather_service,
)
from app.services.climate_service import (
    get_seasonal_climate,
    SeasonalClimateUnavailableError,
)
from app.services.sustainability_service import resolve_soil_profile

# =====================================================================
# Deterministic Agronomic Threshold Constants
# =====================================================================
# Irrigation & Rainfall Thresholds
RAIN_DELAY_PRECIP_MM = 5.0
RAIN_DELAY_PROB_PCT = 60.0
RAIN_DELAY_MIN_SOIL_MOISTURE = 26.0

HEAVY_RAIN_PRECIP_MM = 10.0
HEAVY_RAIN_PROB_PCT = 70.0

IRRIGATE_MAX_SOIL_MOISTURE = 18.0
IRRIGATE_MAX_RAIN_MM = 3.0
IRRIGATE_MAX_RAIN_PROB_PCT = 30.0

WATERLOG_SOIL_MOISTURE_PCT = 45.0
WATERLOG_MIN_RAIN_MM = 5.0

# Disease Risk Microclimate Thresholds
DISEASE_MIN_HUMIDITY_PCT = 80.0
DISEASE_MIN_TEMP_C = 16.0
DISEASE_MAX_TEMP_C = 30.0
DISEASE_MIN_RAIN_MM = 1.0
DISEASE_MIN_RAIN_PROB_PCT = 40.0

# Heat Stress Thresholds
HEAT_MAX_FORECAST_TEMP_C = 38.0
HEAT_CURRENT_TEMP_C = 36.0

# Field Operations / Spraying Thresholds
WIND_SPRAY_MAX_KMH = 20.0
RAIN_SPRAY_MIN_MM = 3.0
RAIN_SPRAY_PROB_PCT = 50.0


def evaluate_agronomic_rules(
    current: WeatherCurrent,
    forecast_days: List[ForecastDay],
    soil_moisture: Optional[float],
    soil_type: Optional[str],
    crop: Optional[str],
    diagnosed_disease: Optional[str],
    irrigation_status: Optional[str],
) -> List[AgronomicAlert]:
    """Evaluate deterministic agronomic rules and return prioritized alerts.

    Rules evaluate live atmospheric data, next 24h forecast, and provided farm conditions.
    Does NOT invent soil moisture values if missing.
    """
    alerts: List[AgronomicAlert] = []

    # Extract 24-hour immediate forecast indicators
    day0 = forecast_days[0] if forecast_days else None
    day0_precip = day0.precipitation_sum if day0 else current.precipitation or 0.0
    day0_rain_prob = day0.precipitation_probability if day0 else 0.0
    day0_max_temp = day0.temp_max if day0 else current.temperature
    day0_min_temp = day0.temp_min if day0 else current.temperature

    # Resolve soil saturation threshold and deficit threshold if soil_type is known
    saturation_threshold = WATERLOG_SOIL_MOISTURE_PCT
    dry_threshold = IRRIGATE_MAX_SOIL_MOISTURE
    if soil_type:
        soil_profile = resolve_soil_profile(soil_type)
        saturation_threshold = soil_profile.get("saturation", WATERLOG_SOIL_MOISTURE_PCT)
        dry_threshold = soil_profile.get("mild_deficit", IRRIGATE_MAX_SOIL_MOISTURE)

    # -----------------------------------------------------------------
    # Rule 1: Waterlogging / Drainage Risk (Priority 1)
    # -----------------------------------------------------------------
    if soil_moisture is not None and soil_moisture >= saturation_threshold:
        if day0_precip >= WATERLOG_MIN_RAIN_MM or day0_rain_prob >= RAIN_DELAY_PROB_PCT:
            alerts.append(
                AgronomicAlert(
                    category="waterlogging",
                    severity="critical",
                    action="IMPROVE_DRAINAGE",
                    title="Waterlogging Hazard",
                    message="High waterlogging risk — check field drainage channels.",
                    reason=(
                        f"Soil moisture is at {soil_moisture:.1f}% (near saturation for {soil_type or 'standard'} soil) "
                        f"and {day0_precip:.1f} mm additional rainfall ({day0_rain_prob:.0f}% probability) is forecasted. "
                        f"Ensure drainage is clear to prevent root hypoxia."
                    ),
                    priority=1,
                )
            )

    # -----------------------------------------------------------------
    # Rule 2: Delay Irrigation (Priority 2)
    # -----------------------------------------------------------------
    if soil_moisture is not None:
        # Case A: Significant rain expected and soil moisture is adequate
        if (day0_precip >= RAIN_DELAY_PRECIP_MM or day0_rain_prob >= RAIN_DELAY_PROB_PCT) and soil_moisture >= RAIN_DELAY_MIN_SOIL_MOISTURE:
            alerts.append(
                AgronomicAlert(
                    category="irrigation",
                    severity="high",
                    action="DELAY_IRRIGATION",
                    title="Delay Irrigation",
                    message="Delay irrigation — rain likely.",
                    reason=(
                        f"{day0_precip:.1f} mm rain forecast within 24 hours ({day0_rain_prob:.0f}% probability) "
                        f"while soil moisture is currently adequate at {soil_moisture:.1f}%."
                    ),
                    priority=2,
                )
            )
        # Case B: Heavy rain expected soon even if soil is currently dry
        elif (day0_precip >= HEAVY_RAIN_PRECIP_MM or (day0_precip >= RAIN_DELAY_PRECIP_MM and day0_rain_prob >= HEAVY_RAIN_PROB_PCT)) and soil_moisture < RAIN_DELAY_MIN_SOIL_MOISTURE:
            alerts.append(
                AgronomicAlert(
                    category="irrigation",
                    severity="high",
                    action="DELAY_IRRIGATION",
                    title="Postpone Irrigation",
                    message="Delay irrigation — heavy rain expected soon.",
                    reason=(
                        f"Although soil moisture is low ({soil_moisture:.1f}%), {day0_precip:.1f} mm heavy rain "
                        f"is forecast ({day0_rain_prob:.0f}% probability). Impending rainfall will naturally replenish root zone."
                    ),
                    priority=2,
                )
            )
        # -----------------------------------------------------------------
        # Rule 3: Irrigate Now (Priority 2)
        # -----------------------------------------------------------------
        elif soil_moisture <= dry_threshold and day0_precip < IRRIGATE_MAX_RAIN_MM and day0_rain_prob < IRRIGATE_MAX_RAIN_PROB_PCT:
            alerts.append(
                AgronomicAlert(
                    category="irrigation",
                    severity="high",
                    action="IRRIGATE_NOW",
                    title="Irrigation Recommended",
                    message="Irrigation recommended — soil moisture is low and little rain is expected.",
                    reason=(
                        f"Soil moisture is low at {soil_moisture:.1f}% (dry threshold {dry_threshold:.1f}%) "
                        f"and only {day0_precip:.1f} mm rain is forecast ({day0_rain_prob:.0f}% probability)."
                    ),
                    priority=2,
                )
            )

    # -----------------------------------------------------------------
    # Rule 4: Raised Disease Risk (Priority 3)
    # -----------------------------------------------------------------
    high_humidity = current.humidity >= DISEASE_MIN_HUMIDITY_PCT
    moderate_temp = DISEASE_MIN_TEMP_C <= current.temperature <= DISEASE_MAX_TEMP_C
    wet_conditions = day0_precip >= DISEASE_MIN_RAIN_MM or day0_rain_prob >= DISEASE_MIN_RAIN_PROB_PCT or (current.precipitation or 0.0) > 0.0

    if high_humidity and wet_conditions and moderate_temp:
        if diagnosed_disease:
            disease_mention = f"for spread of previously diagnosed '{diagnosed_disease}'"
            msg = f"Raised disease risk — monitor canopy for symptoms of {diagnosed_disease}."
        elif crop:
            disease_mention = f"for foliar pathogens in {crop}"
            msg = f"Raised disease risk — monitor {crop} leaves and canopy."
        else:
            disease_mention = "for foliar and fungal pathogens"
            msg = "Raised disease risk — monitor leaves and canopy."

        alerts.append(
            AgronomicAlert(
                category="disease_risk",
                severity="high" if diagnosed_disease else "medium",
                action="MONITOR_DISEASE_RISK",
                title="Raised Disease Risk",
                message=msg,
                reason=(
                    f"High relative humidity ({current.humidity:.1f}%), moderate temperature ({current.temperature:.1f}°C), "
                    f"and wet conditions ({day0_precip:.1f} mm rain forecast) favor fungal microclimates {disease_mention}. "
                    f"Note: This is a weather-based risk indicator, not a direct disease diagnosis."
                ),
                priority=3,
            )
        )

    # -----------------------------------------------------------------
    # Rule 5: Heat Stress (Priority 4)
    # -----------------------------------------------------------------
    if day0_max_temp >= HEAT_MAX_FORECAST_TEMP_C or current.temperature >= HEAT_CURRENT_TEMP_C:
        alerts.append(
            AgronomicAlert(
                category="heat_stress",
                severity="medium",
                action="MITIGATE_HEAT_STRESS",
                title="Heat Stress Alert",
                message="Heat stress risk — monitor crop and soil moisture.",
                reason=(
                    f"Forecast high of {day0_max_temp:.1f}°C (current {current.temperature:.1f}°C) exceeds heat stress threshold. "
                    f"High evapotranspiration expected; irrigate early morning or evening to reduce thermal loss."
                ),
                priority=4,
            )
        )

    # -----------------------------------------------------------------
    # Rule 6: High Wind / Spray Drift Caution (Priority 5)
    # -----------------------------------------------------------------
    if current.wind_speed >= WIND_SPRAY_MAX_KMH:
        alerts.append(
            AgronomicAlert(
                category="field_operations",
                severity="medium",
                action="AVOID_SPRAYING",
                title="Avoid Spraying (High Wind)",
                message="Avoid spraying — strong winds may increase spray drift.",
                reason=(
                    f"Current wind speed is {current.wind_speed:.1f} km/h (threshold {WIND_SPRAY_MAX_KMH} km/h). "
                    f"High winds cause chemical drift, poor droplet deposition, and environmental runoff."
                ),
                priority=5,
            )
        )

    # -----------------------------------------------------------------
    # Rule 7: Rain / Spray Washoff Caution (Priority 5)
    # -----------------------------------------------------------------
    if day0_precip >= RAIN_SPRAY_MIN_MM or day0_rain_prob >= RAIN_SPRAY_PROB_PCT:
        # Only add if not already added wind warning for spraying
        if not any(a.title == "Avoid Spraying (High Wind)" for a in alerts):
            alerts.append(
                AgronomicAlert(
                    category="field_operations",
                    severity="medium",
                    action="AVOID_SPRAYING",
                    title="Avoid Spraying (Rain Likely)",
                    message="Avoid spraying before rainfall.",
                    reason=(
                        f"{day0_precip:.1f} mm rain is forecasted ({day0_rain_prob:.0f}% probability). "
                        f"Foliar sprays applied before rain risk being washed off before absorption."
                    ),
                    priority=5,
                )
            )

    # Sort alerts deterministically by priority ASC
    alerts.sort(key=lambda a: a.priority)
    return alerts


def select_primary_action(alerts: List[AgronomicAlert], farm_context_complete: bool) -> PrimaryAction:
    """Select the single highest-priority non-contradictory primary action."""
    if not alerts:
        if farm_context_complete:
            return PrimaryAction(
                action="MAINTAIN_ROUTINE",
                badge_label="Routine Operations",
                headline="Weather and soil conditions are optimal for normal farm activities.",
                detail="No adverse weather or soil moisture stress detected. Maintain scheduled farming routines.",
                severity="low",
            )
        else:
            return PrimaryAction(
                action="MONITOR_WEATHER",
                badge_label="Weather Stable",
                headline="Weather conditions are currently stable for routine farm activities.",
                detail="Provide soil moisture telemetry or select a soil profile for personalized irrigation recommendations.",
                severity="low",
            )

    top_alert = alerts[0]
    badge_map = {
        "IMPROVE_DRAINAGE": "Drainage Critical",
        "DELAY_IRRIGATION": "Delay Irrigation",
        "IRRIGATE_NOW": "Irrigation Needed",
        "MONITOR_DISEASE_RISK": "Disease Risk",
        "MITIGATE_HEAT_STRESS": "Heat Warning",
        "AVOID_SPRAYING": "Spray Caution",
    }
    badge = badge_map.get(top_alert.action, "Advisory")

    return PrimaryAction(
        action=top_alert.action,
        badge_label=badge,
        headline=top_alert.message,
        detail=top_alert.reason,
        severity=top_alert.severity,
    )


class WeatherIntelligenceService:
    """Service layer orchestrating location resolution, Open-Meteo data fetch, and rule evaluation."""

    def __init__(self, weather_service: Optional[WeatherService] = None):
        self.weather_service = weather_service or _default_weather_service

    async def get_weather_intelligence(
        self, request: WeatherIntelligenceRequest
    ) -> WeatherIntelligenceResponse:
        """Process WeatherIntelligenceRequest and return structured response."""
        cleaned_location = request.location.strip()
        if not cleaned_location:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Location parameter cannot be empty.",
            )

        timeout = httpx.Timeout(self.weather_service.timeout)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                geo_match = await self.weather_service.geocode_location(cleaned_location, client)
                latitude = float(geo_match.get("latitude", 0.0))
                longitude = float(geo_match.get("longitude", 0.0))
                forecast_data = await self.weather_service.fetch_forecast_data(
                    latitude, longitude, client, forecast_days=request.forecast_days
                )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Weather forecast service timed out. Please try again.",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to reach weather provider: {str(exc)}",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Weather provider returned error: {exc.response.status_code}",
            )


        loc_name = geo_match.get("name") or cleaned_location.title()
        country = geo_match.get("country", "Unknown")
        state = geo_match.get("admin1")
        district = geo_match.get("admin2") or geo_match.get("admin3")

        location_obj = WeatherLocation(
            name=loc_name,
            country=country,
            latitude=latitude,
            longitude=longitude,
            state=state,
            district=district,
        )

        current_dict = forecast_data.get("current", {})
        daily_dict = forecast_data.get("daily", {})

        current_obj = WeatherCurrent(
            temperature=float(current_dict.get("temperature_2m", 0.0)),
            humidity=float(current_dict.get("relative_humidity_2m", 0.0)),
            wind_speed=float(current_dict.get("wind_speed_10m", 0.0)),
            weather_code=int(current_dict.get("weather_code", 0)),
            condition=get_weather_condition(int(current_dict.get("weather_code", 0))),
            precipitation=float(current_dict.get("precipitation", 0.0)),
        )

        # Parse 7-day daily forecast list
        time_list = daily_dict.get("time", [])
        weather_code_list = daily_dict.get("weather_code", [])
        temp_max_list = daily_dict.get("temperature_2m_max", [])
        temp_min_list = daily_dict.get("temperature_2m_min", [])
        precip_sum_list = daily_dict.get("precipitation_sum", [])
        precip_prob_list = daily_dict.get("precipitation_probability_max", [])

        num_days = min(
            len(time_list),
            len(temp_max_list),
            request.forecast_days,
        )

        forecast_daily: List[ForecastDay] = []
        for i in range(num_days):
            w_code = int(weather_code_list[i]) if i < len(weather_code_list) and weather_code_list[i] is not None else 0
            t_max = float(temp_max_list[i]) if i < len(temp_max_list) and temp_max_list[i] is not None else current_obj.temperature
            t_min = float(temp_min_list[i]) if i < len(temp_min_list) and temp_min_list[i] is not None else current_obj.temperature
            p_sum = float(precip_sum_list[i]) if i < len(precip_sum_list) and precip_sum_list[i] is not None else 0.0
            p_prob = float(precip_prob_list[i]) if i < len(precip_prob_list) and precip_prob_list[i] is not None else 0.0
            date_str = str(time_list[i]) if i < len(time_list) else datetime.now(timezone.utc).strftime("%Y-%m-%d")

            forecast_daily.append(
                ForecastDay(
                    date=date_str,
                    temp_min=t_min,
                    temp_max=t_max,
                    precipitation_sum=p_sum,
                    precipitation_probability=p_prob,
                    weather_code=w_code,
                    condition=get_weather_condition(w_code),
                )
            )

        # Ensure at least 1 day exists in forecast_daily
        if not forecast_daily:
            forecast_daily.append(
                ForecastDay(
                    date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    temp_min=current_obj.temperature,
                    temp_max=current_obj.temperature,
                    precipitation_sum=current_obj.precipitation or 0.0,
                    precipitation_probability=0.0,
                    weather_code=current_obj.weather_code,
                    condition=current_obj.condition,
                )
            )

        farm_context_complete = request.soil_moisture_percent is not None

        farm_context_applied = {
            "crop": request.crop,
            "soil_moisture_percent": request.soil_moisture_percent,
            "soil_type": request.soil_type,
            "diagnosed_disease": request.diagnosed_disease,
            "irrigation_status": request.irrigation_status,
        }

        alerts = evaluate_agronomic_rules(
            current=current_obj,
            forecast_days=forecast_daily,
            soil_moisture=request.soil_moisture_percent,
            soil_type=request.soil_type,
            crop=request.crop,
            diagnosed_disease=request.diagnosed_disease,
            irrigation_status=request.irrigation_status,
        )

        primary_action = select_primary_action(alerts, farm_context_complete=farm_context_complete)

        # Determine data source attribution
        lookup_state = state or loc_name
        seasonal_used = False
        if lookup_state:
            try:
                climate = get_seasonal_climate(state=lookup_state, district=district)
                if climate:
                    seasonal_used = True
            except SeasonalClimateUnavailableError:
                pass

        data_source = (
            "Open-Meteo API & India Meteorological Department (IMD) Normals"
            if seasonal_used
            else "Open-Meteo API"
        )

        return WeatherIntelligenceResponse(
            location=location_obj,
            current=current_obj,
            forecast_daily=forecast_daily,
            primary_action=primary_action,
            alerts=alerts,
            farm_context_applied=farm_context_applied,
            farm_context_complete=farm_context_complete,
            data_source=data_source,
            timestamp=datetime.now(timezone.utc),
        )


_default_intelligence_service = WeatherIntelligenceService()


async def build_weather_intelligence(
    request: WeatherIntelligenceRequest,
) -> WeatherIntelligenceResponse:
    """Convenience functional interface for generating weather intelligence."""
    return await _default_intelligence_service.get_weather_intelligence(request)
