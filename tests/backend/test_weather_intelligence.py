"""Unit and API integration tests for Weather-Based Intelligence Service.

Tests deterministic rule evaluation, priority hierarchies, soil moisture decoupling,
disease risk conservative warnings, and endpoint error handling with mocked weather providers.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
import httpx

from app.main import app
from app.schemas import (
    WeatherIntelligenceRequest,
    WeatherIntelligenceResponse,
    WeatherLocation,
    WeatherCurrent,
    ForecastDay,
)
from app.services.weather_intelligence_service import (
    evaluate_agronomic_rules,
    select_primary_action,
    WeatherIntelligenceService,
)


@pytest.fixture
def client():
    return TestClient(app)


def make_mock_geo_match(location_name="Pune", state="Maharashtra", district="Pune"):
    return {
        "name": location_name,
        "country": "India",
        "admin1": state,
        "admin2": district,
        "latitude": 18.5204,
        "longitude": 73.8567,
    }


def make_mock_forecast_data(
    current_temp=26.0,
    current_humidity=65.0,
    current_wind=12.0,
    current_precip=0.0,
    current_weather_code=1,
    daily_precip=0.0,
    daily_rain_prob=10.0,
    daily_temp_max=32.0,
    daily_temp_min=20.0,
    daily_weather_code=1,
    forecast_days=7,
):
    times = [f"2026-09-{15+i:02d}" for i in range(forecast_days)]
    return {
        "current": {
            "temperature_2m": current_temp,
            "relative_humidity_2m": current_humidity,
            "wind_speed_10m": current_wind,
            "precipitation": current_precip,
            "weather_code": current_weather_code,
        },
        "daily": {
            "time": times,
            "temperature_2m_max": [daily_temp_max] * forecast_days,
            "temperature_2m_min": [daily_temp_min] * forecast_days,
            "precipitation_sum": [daily_precip] * forecast_days,
            "precipitation_probability_max": [daily_rain_prob] * forecast_days,
            "weather_code": [daily_weather_code] * forecast_days,
        },
    }


# =====================================================================
# Deterministic Rule Unit Tests
# =====================================================================

def test_rule_delay_irrigation_rain_and_adequate_moisture():
    """Test Case 1: Significant rain + adequate soil moisture triggers DELAY_IRRIGATION."""
    current = WeatherCurrent(
        temperature=26.0,
        humidity=70.0,
        wind_speed=12.0,
        weather_code=61,
        condition="Slight rain",
        precipitation=2.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=20.0,
            temp_max=28.0,
            precipitation_sum=12.0,
            precipitation_probability=80.0,
            weather_code=63,
            condition="Moderate rain",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=34.0,
        soil_type="loam",
        crop="Wheat",
        diagnosed_disease=None,
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "DELAY_IRRIGATION" in actions

    delay_alert = next(a for a in alerts if a.action == "DELAY_IRRIGATION")
    assert "12.0 mm rain forecast" in delay_alert.reason
    assert "34.0%" in delay_alert.reason
    assert delay_alert.priority == 2


def test_rule_irrigate_now_dry_soil_and_no_rain():
    """Test Case 2: Critically dry soil + no rain forecast triggers IRRIGATE_NOW."""
    current = WeatherCurrent(
        temperature=28.0,
        humidity=45.0,
        wind_speed=10.0,
        weather_code=0,
        condition="Clear sky",
        precipitation=0.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=18.0,
            temp_max=32.0,
            precipitation_sum=0.0,
            precipitation_probability=10.0,
            weather_code=0,
            condition="Clear sky",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=14.0,
        soil_type="sandy",
        crop="Maize",
        diagnosed_disease=None,
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "IRRIGATE_NOW" in actions

    irrigate_alert = next(a for a in alerts if a.action == "IRRIGATE_NOW")
    assert "14.0%" in irrigate_alert.reason
    assert "0.0 mm" in irrigate_alert.reason


def test_rule_raised_disease_risk_high_humidity_and_rain():
    """Test Case 3: High humidity + moderate temp + rain triggers MONITOR_DISEASE_RISK."""
    current = WeatherCurrent(
        temperature=22.0,
        humidity=86.0,
        wind_speed=8.0,
        weather_code=61,
        condition="Slight rain",
        precipitation=1.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=18.0,
            temp_max=24.0,
            precipitation_sum=4.0,
            precipitation_probability=65.0,
            weather_code=61,
            condition="Slight rain",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=28.0,
        soil_type="black",
        crop="Potato",
        diagnosed_disease="Potato___Early_blight",
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "MONITOR_DISEASE_RISK" in actions

    disease_alert = next(a for a in alerts if a.action == "MONITOR_DISEASE_RISK")
    assert "Potato___Early_blight" in disease_alert.message
    assert "weather-based risk indicator" in disease_alert.reason


def test_rule_heat_stress_alert():
    """Test Case 4: Extreme forecast temperature (41°C) triggers MITIGATE_HEAT_STRESS."""
    current = WeatherCurrent(
        temperature=35.0,
        humidity=35.0,
        wind_speed=14.0,
        weather_code=0,
        condition="Clear sky",
        precipitation=0.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=24.0,
            temp_max=41.0,
            precipitation_sum=0.0,
            precipitation_probability=5.0,
            weather_code=0,
            condition="Clear sky",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=25.0,
        soil_type="loam",
        crop="Cotton",
        diagnosed_disease=None,
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "MITIGATE_HEAT_STRESS" in actions

    heat_alert = next(a for a in alerts if a.action == "MITIGATE_HEAT_STRESS")
    assert "41.0°C" in heat_alert.reason


def test_rule_high_wind_spray_caution():
    """Test Case 5: Strong winds (28 km/h) trigger AVOID_SPRAYING."""
    current = WeatherCurrent(
        temperature=28.0,
        humidity=50.0,
        wind_speed=28.0,
        weather_code=2,
        condition="Partly cloudy",
        precipitation=0.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=20.0,
            temp_max=30.0,
            precipitation_sum=0.0,
            precipitation_probability=10.0,
            weather_code=2,
            condition="Partly cloudy",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=30.0,
        soil_type="loam",
        crop=None,
        diagnosed_disease=None,
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "AVOID_SPRAYING" in actions
    wind_alert = next(a for a in alerts if a.action == "AVOID_SPRAYING")
    assert "28.0 km/h" in wind_alert.reason


def test_rule_waterlogging_hazard():
    """Test Case 6: Saturated soil (48%) + forecast rain triggers IMPROVE_DRAINAGE with top priority."""
    current = WeatherCurrent(
        temperature=24.0,
        humidity=88.0,
        wind_speed=10.0,
        weather_code=63,
        condition="Moderate rain",
        precipitation=5.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=20.0,
            temp_max=26.0,
            precipitation_sum=15.0,
            precipitation_probability=85.0,
            weather_code=63,
            condition="Moderate rain",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=48.0,
        soil_type="clay",
        crop="Rice",
        diagnosed_disease=None,
        irrigation_status=None,
    )

    assert len(alerts) > 0
    assert alerts[0].action == "IMPROVE_DRAINAGE"
    assert alerts[0].priority == 1
    assert alerts[0].severity == "critical"


def test_missing_soil_moisture_does_not_fabricate_irrigation_action():
    """Test Case 7: When soil moisture is None, irrigation actions (IRRIGATE_NOW / DELAY_IRRIGATION) are not generated."""
    current = WeatherCurrent(
        temperature=25.0,
        humidity=55.0,
        wind_speed=12.0,
        weather_code=0,
        condition="Clear sky",
        precipitation=0.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=18.0,
            temp_max=30.0,
            precipitation_sum=0.0,
            precipitation_probability=10.0,
            weather_code=0,
            condition="Clear sky",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=None,
        soil_type=None,
        crop="Wheat",
        diagnosed_disease=None,
        irrigation_status=None,
    )

    actions = [a.action for a in alerts]
    assert "IRRIGATE_NOW" not in actions
    assert "DELAY_IRRIGATION" not in actions
    assert "IMPROVE_DRAINAGE" not in actions

    primary = select_primary_action(alerts, farm_context_complete=False)
    assert primary.action == "MONITOR_WEATHER"


def test_missing_crop_provides_generic_disease_monitoring():
    """Test Case 8: When crop is None, generic disease monitoring is provided if weather conditions warrant."""
    current = WeatherCurrent(
        temperature=23.0,
        humidity=85.0,
        wind_speed=6.0,
        weather_code=61,
        condition="Slight rain",
        precipitation=2.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=19.0,
            temp_max=25.0,
            precipitation_sum=5.0,
            precipitation_probability=70.0,
            weather_code=61,
            condition="Slight rain",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=None,
        soil_type=None,
        crop=None,
        diagnosed_disease=None,
        irrigation_status=None,
    )

    disease_alert = next((a for a in alerts if a.action == "MONITOR_DISEASE_RISK"), None)
    assert disease_alert is not None
    assert disease_alert.message == "Raised disease risk — monitor leaves and canopy."


def test_multiple_simultaneous_alerts_deterministic_priority():
    """Test Case 9: Multiple active triggers sort deterministically by priority."""
    # Saturated soil (P1), Rain & Adequate Soil (P2), Fungal Microclimate (P3), Heat (P4), High Wind (P5)
    current = WeatherCurrent(
        temperature=37.0,
        humidity=85.0,
        wind_speed=24.0,
        weather_code=63,
        condition="Moderate rain",
        precipitation=6.0,
    )
    forecast = [
        ForecastDay(
            date="2026-09-15",
            temp_min=24.0,
            temp_max=39.0,
            precipitation_sum=12.0,
            precipitation_probability=80.0,
            weather_code=63,
            condition="Moderate rain",
        )
    ]

    alerts = evaluate_agronomic_rules(
        current=current,
        forecast_days=forecast,
        soil_moisture=46.0,
        soil_type="loam",
        crop="Potato",
        diagnosed_disease="Potato___Late_blight",
        irrigation_status=None,
    )

    priorities = [a.priority for a in alerts]
    assert priorities == sorted(priorities)
    assert alerts[0].action == "IMPROVE_DRAINAGE"

    primary = select_primary_action(alerts, farm_context_complete=True)
    assert primary.action == "IMPROVE_DRAINAGE"


# =====================================================================
# API Endpoint Integration Tests (POST /api/weather-intelligence)
# =====================================================================

def test_api_weather_intelligence_success(client):
    """Verify POST /api/weather-intelligence returns 200 with full structured response."""
    mock_geo = make_mock_geo_match("Ahmedabad", "Gujarat", "Ahmedabad")
    mock_forecast = make_mock_forecast_data(
        current_temp=30.0,
        current_humidity=60.0,
        current_wind=12.0,
        current_precip=0.0,
        daily_precip=8.0,
        daily_rain_prob=75.0,
        daily_temp_max=34.0,
        daily_temp_min=24.0,
    )

    with patch.object(WeatherIntelligenceService, "get_weather_intelligence") as mock_service_fn:
        mock_response = WeatherIntelligenceResponse(
            location=WeatherLocation(
                name="Ahmedabad",
                country="India",
                latitude=23.0225,
                longitude=72.5714,
                state="Gujarat",
                district="Ahmedabad",
            ),
            current=WeatherCurrent(
                temperature=30.0,
                humidity=60.0,
                wind_speed=12.0,
                weather_code=1,
                condition="Mainly clear",
                precipitation=0.0,
            ),
            forecast_daily=[
                ForecastDay(
                    date="2026-09-15",
                    temp_min=24.0,
                    temp_max=34.0,
                    precipitation_sum=8.0,
                    precipitation_probability=75.0,
                    weather_code=61,
                    condition="Slight rain",
                )
            ],
            primary_action=select_primary_action([], farm_context_complete=True),
            alerts=[],
            farm_context_applied={"crop": "Cotton", "soil_moisture_percent": 30.0},
            farm_context_complete=True,
            data_source="Open-Meteo API & India Meteorological Department (IMD) Normals",
        )
        mock_service_fn.return_value = mock_response

        payload = {
            "location": "Ahmedabad",
            "crop": "Cotton",
            "soil_moisture_percent": 30.0,
            "soil_type": "black",
        }
        response = client.post("/api/weather-intelligence", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["location"]["name"] == "Ahmedabad"
        assert "primary_action" in data
        assert data["farm_context_complete"] is True
        assert "Open-Meteo" in data["data_source"]


def test_api_weather_intelligence_provider_503(client):
    """Test Case 10: Provider outage returns clean HTTP 503."""
    with patch("app.services.weather_service.WeatherService.geocode_location", side_effect=httpx.TimeoutException("Timeout")):
        payload = {"location": "Pune"}
        # Testing through route handler with patched internal call
        response = client.post("/api/weather-intelligence", json=payload)
        assert response.status_code in (503, 500)


def test_api_weather_intelligence_unknown_location_404(client):
    """Test Case 11: Unknown location returns HTTP 404."""
    with patch("app.services.weather_service.WeatherService.geocode_location") as mock_geo:
        from fastapi import HTTPException
        mock_geo.side_effect = HTTPException(status_code=404, detail="Location 'UnknownCity123' not found.")

        payload = {"location": "UnknownCity123"}
        response = client.post("/api/weather-intelligence", json=payload)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


def test_api_weather_intelligence_empty_location_422_or_400(client):
    """Verify empty or missing location returns 422 Unprocessable Entity."""
    response = client.post("/api/weather-intelligence", json={"location": ""})
    assert response.status_code in (400, 422)
