"""Deterministic Sustainability Scoring Engine for AgriSmart AI.

Evaluates 4 transparent dimensions:
1. Water Conservation & Irrigation Timing (0–40 pts)
2. Microclimate & Weather Alignment (0–30 pts)
3. Soil Moisture & Root-Zone Balance (0–15 pts)
4. Crop Rotation & Agro-Ecological Compatibility (0–15 pts)

Combines live weather forecasts with simulated/real IoT capacitance and flow telemetry.
Guarantees 100% deterministic, explainable results with exact mathematical accounting.
"""

from typing import Dict, Any, Tuple
from app.schemas import (
    SustainabilityScoreRequest,
    SustainabilityScoreResponse,
    ScoreBreakdownItem,
    WaterImpactEstimate,
    ActionComparisonOption,
    SensorTelemetry,
)
from app.services.iot_sensor_service import IoTSensorService

LEGUMES = {"chickpea", "moong", "soybean", "pulses", "groundnut", "pigeonpea", "urad", "clusterbean"}
CEREALS = {"wheat", "rice", "maize", "bajra", "jowar", "barley"}
CASH_CROPS = {"cotton", "sugarcane", "potato", "tobacco"}


def is_rain_imminent(rain_prob: float, expected_rainfall: float) -> bool:
    """Return True if rainfall is forecast with high confidence and meaningful volume."""
    return rain_prob >= 60.0 and expected_rainfall >= 5.0


def calculate_water_conservation(
    action: str,
    rain_prob: float,
    expected_rainfall: float,
    soil_moisture: float,
) -> Tuple[float, str, str]:
    """Dimension 1: Water Conservation & Irrigation Timing (Max 40 points)."""
    rain_imminent = is_rain_imminent(rain_prob, expected_rainfall)

    if action == "delay" and rain_imminent:
        return (
            40.0,
            f"Forecasted rainfall (≥60% probability, {expected_rainfall:.1f} mm) utilized; irrigation postponed to capture natural precipitation.",
            "Optimal Timing",
        )

    if action == "irrigate_now" and rain_imminent:
        return (
            10.0,
            f"Irrigation triggered despite imminent rainfall ({rain_prob:.0f}% chance, {expected_rainfall:.1f} mm); high risk of surface runoff and energy waste.",
            "Runoff Risk",
        )

    # When no heavy rain is forecast
    if soil_moisture < 25.0:
        if action == "irrigate_now":
            return (
                36.0,
                f"Timely irrigation applied to address dry root-zone moisture ({soil_moisture:.1f}% < 25%); protects crop from wilting.",
                "Targeted Relief",
            )
        return (
            22.0,
            f"Irrigation delayed despite dry root-zone moisture ({soil_moisture:.1f}%); risk of drought stress if postponed further.",
            "Under-Irrigated",
        )

    if soil_moisture > 40.0:
        if action == "delay":
            return (
                38.0,
                f"Irrigation delayed for moist soil ({soil_moisture:.1f}% > 40%); prevents waterlogging and leaching.",
                "Saturation Avoided",
            )
        return (
            14.0,
            f"Irrigation applied to already saturated soil ({soil_moisture:.1f}% > 40%); unnecessary water application.",
            "Over-Irrigation",
        )

    # Baseline optimal zone (25-40%) without imminent rain
    if action == "delay":
        return (
            32.0,
            f"Standard conservation: root-zone moisture ({soil_moisture:.1f}%) is within healthy field capacity; routine deferral.",
            "Preserved",
        )
    return (
        28.0,
        f"Routine maintenance irrigation applied within acceptable soil moisture ({soil_moisture:.1f}%).",
        "Routine Use",
    )


def calculate_weather_alignment(
    temperature: float,
    humidity: float,
    rain_prob: float,
) -> Tuple[float, str, str]:
    """Dimension 2: Microclimate & Weather Alignment (Max 30 points)."""
    rain_points = 10.0 if rain_prob >= 60.0 else (6.0 if rain_prob >= 30.0 else 3.0)

    if 18.0 <= temperature <= 34.0:
        temp_points = 14.0
        temp_note = f"optimal temperature ({temperature:.1f}°C in 18–34°C vegetative window)"
    elif 10.0 <= temperature < 18.0:
        temp_points = 8.0
        temp_note = f"cool temperature ({temperature:.1f}°C) with reduced evapotranspiration"
    elif temperature > 35.0:
        temp_points = 4.0
        temp_note = f"high temperature ({temperature:.1f}°C > 35°C) presenting thermal stress"
    else:
        temp_points = 2.0
        temp_note = f"extreme temperature ({temperature:.1f}°C)"

    if humidity <= 75.0:
        hum_points = 6.0
        hum_note = f"healthy relative humidity ({humidity:.0f}%)"
    elif humidity <= 85.0:
        hum_points = 3.0
        hum_note = f"elevated humidity ({humidity:.0f}%) with moderate fungal caution"
    else:
        hum_points = 0.0
        hum_note = f"very high humidity ({humidity:.0f}% > 85%) elevating foliar disease risk"

    total = min(30.0, rain_points + temp_points + hum_points)
    status = "Favorable" if total >= 22.0 else ("Moderate" if total >= 14.0 else "Stressful")
    reason = f"Microclimate factors: {temp_note} (+{temp_points:.0f} pts), {hum_note} (+{hum_points:.0f} pts), and rain chance {rain_prob:.0f}% (+{rain_points:.0f} pts)."
    return (total, reason, status)


def calculate_soil_moisture_balance(soil_moisture: float) -> Tuple[float, str, str]:
    """Dimension 3: Soil Moisture & Root-Zone Balance (Max 15 points)."""
    if 25.0 <= soil_moisture <= 40.0:
        return (
            15.0,
            f"IoT probe shows root-zone moisture ({soil_moisture:.1f}%) within optimal agronomic field capacity (25%–40%).",
            "Optimal",
        )
    if 20.0 <= soil_moisture < 25.0:
        return (
            10.0,
            f"IoT probe indicates mild moisture deficit ({soil_moisture:.1f}%); approaching irrigation threshold.",
            "Mild Deficit",
        )
    if soil_moisture < 20.0:
        return (
            4.0,
            f"IoT probe detects acute soil moisture deficit ({soil_moisture:.1f}% < 20%); root-zone approaching temporary wilting point.",
            "Severe Deficit",
        )
    if 40.0 < soil_moisture <= 45.0:
        return (
            9.0,
            f"IoT probe reports elevated moisture ({soil_moisture:.1f}%); root aeration marginally constrained.",
            "Elevated",
        )
    return (
        3.0,
        f"IoT probe reports waterlogged conditions ({soil_moisture:.1f}% > 45%); risk of root asphyxiation and damping-off.",
        "Waterlogged",
    )


def calculate_crop_rotation_compatibility(
    target_crop: str,
    previous_crop: str | None,
    soil_type: str | None,
) -> Tuple[float, str, str]:
    """Dimension 4: Crop Rotation & Agro-Ecological Compatibility (Max 15 points)."""
    if not previous_crop or not previous_crop.strip():
        return (
            10.0,
            f"Target crop '{target_crop.title()}' evaluated as standalone seasonal planting without preceding rotation history (+10 pts baseline).",
            "Baseline Single-Crop",
        )

    t_crop = target_crop.strip().lower()
    p_crop = previous_crop.strip().lower()

    # Monoculture detection
    if t_crop == p_crop:
        return (
            4.0,
            f"Continuous monoculture of '{t_crop.title()}' following '{p_crop.title()}'; increases soil-borne pathogen persistence and nutrient depletion.",
            "Monoculture Risk",
        )

    is_t_legume = any(leg in t_crop for leg in LEGUMES)
    is_p_legume = any(leg in p_crop for leg in LEGUMES)
    is_t_cereal = any(cer in t_crop for cer in CEREALS)
    is_p_cereal = any(cer in p_crop for cer in CEREALS)
    is_t_cash = any(c in t_crop for c in CASH_CROPS)
    is_p_cash = any(c in p_crop for c in CASH_CROPS)

    if (is_t_legume and (is_p_cereal or is_p_cash)) or ((is_t_cereal or is_t_cash) and is_p_legume):
        return (
            15.0,
            f"Synergistic restorative rotation ('{p_crop.title()}' → '{t_crop.title()}'); breaks pest cycles, replenishes soil nitrogen, and optimizes nutrient uptake.",
            "Optimal Rotation",
        )

    if is_t_legume or is_p_legume:
        return (
            13.0,
            f"Beneficial rotation incorporating legume biology ('{p_crop.title()}' → '{t_crop.title()}'); supports soil microbial health.",
            "Favorable Rotation",
        )

    return (
        11.0,
        f"Standard diverse crop sequence ('{p_crop.title()}' → '{t_crop.title()}'); interrupts host-specific disease cycles compared to monoculture.",
        "Diverse Rotation",
    )


def calculate_water_volume_impact(
    action: str,
    rain_prob: float,
    expected_rainfall: float,
    soil_moisture: float,
    farm_area_ha: float,
    telemetry: SensorTelemetry,
) -> WaterImpactEstimate:
    """Calculate explicit volumetric water impact in Liters based on IoT flow and duration."""
    nominal_cycle_liters = telemetry.irrigation_flow_rate_lpm * telemetry.irrigation_duration_minutes
    # Scaling: 1 standard 0.1 ha drip sub-block
    baseline_block_ha = 0.1
    scaled_liters = int(round(nominal_cycle_liters * (farm_area_ha / baseline_block_ha)))

    rain_imminent = is_rain_imminent(rain_prob, expected_rainfall)

    if action == "delay":
        if rain_imminent or soil_moisture > 40.0:
            return WaterImpactEstimate(
                litres=scaled_liters,
                impact_type="saved",
                label=f"Estimated {scaled_liters:,} Litres Conserved",
                formula_basis=f"{telemetry.irrigation_flow_rate_lpm:.0f} L/min × {telemetry.irrigation_duration_minutes} min × ({farm_area_ha:.2f} ha / 0.1 ha) delayed due to sufficient water/forecast.",
            )
        return WaterImpactEstimate(
            litres=scaled_liters,
            impact_type="neutral",
            label=f"Estimated {scaled_liters:,} Litres Deferred",
            formula_basis=f"Irrigation deferred under standard operational schedule for {farm_area_ha:.2f} ha.",
        )

    # action == "irrigate_now"
    if rain_imminent or soil_moisture > 40.0:
        return WaterImpactEstimate(
            litres=scaled_liters,
            impact_type="unnecessary_use",
            label=f"Estimated {scaled_liters:,} Litres Redundant Application",
            formula_basis=f"Application during imminent rain or soil saturation leads to avoidable pumping across {farm_area_ha:.2f} ha.",
        )

    return WaterImpactEstimate(
        litres=scaled_liters,
        impact_type="neutral",
        label=f"{scaled_liters:,} Litres Productively Delivered",
        formula_basis=f"Measured water delivery ({telemetry.irrigation_flow_rate_lpm:.0f} L/min over {telemetry.irrigation_duration_minutes} min) satisfying crop requirement on {farm_area_ha:.2f} ha.",
    )


def generate_recommendation_text(
    action: str,
    rain_prob: float,
    expected_rainfall: float,
    soil_moisture: float,
    total_score: int,
) -> str:
    """Generate unambiguous operational advice for farmers."""
    rain_imminent = is_rain_imminent(rain_prob, expected_rainfall)

    if rain_imminent:
        if soil_moisture > 40.0:
            return "Postpone irrigation for 24–48 hours. Heavy rainfall is imminent and soil moisture is already elevated, avoiding root hypoxia."
        return "Postpone irrigation for 24 hours. Natural precipitation will sufficiently replenish root-zone moisture without groundwater pumping."

    if soil_moisture < 25.0:
        return "Irrigate during early morning or evening hours. Root-zone moisture has dropped below the comfort threshold and no significant precipitation is forecast."

    if soil_moisture > 40.0:
        return "Hold irrigation. Current root-zone moisture is sufficient; additional watering risks nutrient leaching."

    return "Maintain routine monitoring. Soil moisture, microclimate, and crop rotation indices are well-balanced."


class SustainabilityService:
    """Service executing deterministic sustainability scoring."""

    @classmethod
    def calculate_score(cls, request: SustainabilityScoreRequest) -> SustainabilityScoreResponse:
        """Calculate explainable 100-point sustainability score."""
        # 1. Resolve IoT telemetry (deterministic simulated presets or explicit override)
        telemetry = IoTSensorService.resolve_telemetry(
            telemetry_override=request.telemetry,
            soil_moisture_override=request.soil_moisture_percent,
        )

        soil_moisture = telemetry.soil_moisture_percent
        temp = request.temperature_celsius
        humidity = request.humidity_percent
        rain_prob = request.rain_probability_percent
        rainfall = request.expected_rainfall_mm

        # 2. Compute 4 dimensions
        water_pts, water_reason, water_status = calculate_water_conservation(
            action=request.action,
            rain_prob=rain_prob,
            expected_rainfall=rainfall,
            soil_moisture=soil_moisture,
        )

        weather_pts, weather_reason, weather_status = calculate_weather_alignment(
            temperature=temp,
            humidity=humidity,
            rain_prob=rain_prob,
        )

        soil_pts, soil_reason, soil_status = calculate_soil_moisture_balance(soil_moisture)

        rotation_pts, rotation_reason, rotation_status = calculate_crop_rotation_compatibility(
            target_crop=request.crop,
            previous_crop=request.previous_crop,
            soil_type=request.soil_type,
        )

        raw_total = water_pts + weather_pts + soil_pts + rotation_pts
        total_score = max(0, min(100, int(round(raw_total))))

        if total_score >= 80:
            score_label = "Excellent"
        elif total_score >= 60:
            score_label = "Good"
        else:
            score_label = "Needs Improvement"

        # 3. Water volume calculation
        water_impact = calculate_water_volume_impact(
            action=request.action,
            rain_prob=rain_prob,
            expected_rainfall=rainfall,
            soil_moisture=soil_moisture,
            farm_area_ha=request.farm_area_hectares,
            telemetry=telemetry,
        )

        # 4. Action comparison (What-if delay vs irrigate_now)
        comparison: Dict[str, ActionComparisonOption] = {}
        for act in ("delay", "irrigate_now"):
            comp_water_pts, _, _ = calculate_water_conservation(
                action=act,
                rain_prob=rain_prob,
                expected_rainfall=rainfall,
                soil_moisture=soil_moisture,
            )
            comp_total = max(0, min(100, int(round(comp_water_pts + weather_pts + soil_pts + rotation_pts))))
            comp_label = "Excellent" if comp_total >= 80 else ("Good" if comp_total >= 60 else "Needs Improvement")
            comp_impact = calculate_water_volume_impact(
                action=act,
                rain_prob=rain_prob,
                expected_rainfall=rainfall,
                soil_moisture=soil_moisture,
                farm_area_ha=request.farm_area_hectares,
                telemetry=telemetry,
            )
            comparison[act] = ActionComparisonOption(
                action=act,
                score=comp_total,
                score_label=comp_label,
                water_impact_litres=comp_impact.litres,
                water_impact_type=comp_impact.impact_type,
            )

        recommendation = generate_recommendation_text(
            action=request.action,
            rain_prob=rain_prob,
            expected_rainfall=rainfall,
            soil_moisture=soil_moisture,
            total_score=total_score,
        )

        breakdown = {
            "water_conservation": ScoreBreakdownItem(
                dimension="Water Conservation & Irrigation Timing",
                points=water_pts,
                max_points=40.0,
                percentage=round((water_pts / 40.0) * 100, 1),
                reason=water_reason,
                status=water_status,
            ),
            "microclimate_alignment": ScoreBreakdownItem(
                dimension="Microclimate & Weather Alignment",
                points=weather_pts,
                max_points=30.0,
                percentage=round((weather_pts / 30.0) * 100, 1),
                reason=weather_reason,
                status=weather_status,
            ),
            "soil_moisture_balance": ScoreBreakdownItem(
                dimension="Soil Moisture & Root-Zone Balance",
                points=soil_pts,
                max_points=15.0,
                percentage=round((soil_pts / 15.0) * 100, 1),
                reason=soil_reason,
                status=soil_status,
            ),
            "crop_rotation_compatibility": ScoreBreakdownItem(
                dimension="Crop Rotation & Agro-Ecological Health",
                points=rotation_pts,
                max_points=15.0,
                percentage=round((rotation_pts / 15.0) * 100, 1),
                reason=rotation_reason,
                status=rotation_status,
            ),
        }

        summary = (
            f"Sustainability Score: {total_score}/100 ({score_label}). "
            f"Evaluates farm plot ({request.farm_area_hectares} ha) growing '{request.crop.title()}' "
            f"with soil moisture {soil_moisture:.1f}% under current meteorological and planned '{request.action}' management."
        )

        return SustainabilityScoreResponse(
            total_score=total_score,
            score_label=score_label,
            summary=summary,
            recommendation=recommendation,
            breakdown=breakdown,
            water_impact=water_impact,
            comparison=comparison,
            telemetry_used=telemetry,
            simulated_telemetry_notice="Sensor telemetry is generated via the Simulated IoT Sensor Layer for prototype validation.",
        )
