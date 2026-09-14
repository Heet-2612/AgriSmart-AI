"""Unit tests for Weather Intelligence Service."""

import pytest
import httpx
from fastapi import HTTPException
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.weather_service import (
    WeatherService,
    get_weather_condition,
    generate_farm_advisories,
    WMO_WEATHER_CODES,
    fetch_weather_by_location,
)
from app.schemas import WeatherResponse


def test_wmo_weather_codes_mapping():
    """Verify standard WMO weather codes map to human-readable strings."""
    assert get_weather_condition(0) == "Clear sky"
    assert get_weather_condition(61) == "Slight rain"
    assert get_weather_condition(95) == "Thunderstorm"
    assert get_weather_condition(999) == "Unknown conditions"


def test_generate_farm_advisories_rules():
    """Verify deterministic agronomic advisory generation under various conditions."""
    # 1. Rain expected >= 5mm
    adv1 = generate_farm_advisories(
        precipitation_sum=6.0,
        precipitation_probability=40.0,
        max_temp=28.0,
        humidity=60.0,
        wind_speed=10.0,
    )
    assert any("Rain is expected today" in a for a in adv1)

    # 2. Rain probability >= 60%
    adv2 = generate_farm_advisories(
        precipitation_sum=2.0,
        precipitation_probability=75.0,
        max_temp=28.0,
        humidity=60.0,
        wind_speed=10.0,
    )
    assert any("High chance of rain" in a for a in adv2)

    # 3. High heat >= 35°C
    adv3 = generate_farm_advisories(
        precipitation_sum=0.0,
        precipitation_probability=10.0,
        max_temp=38.0,
        humidity=40.0,
        wind_speed=10.0,
    )
    assert any("High heat expected" in a for a in adv3)

    # 4. High humidity >= 80%
    adv4 = generate_farm_advisories(
        precipitation_sum=0.0,
        precipitation_probability=20.0,
        max_temp=28.0,
        humidity=88.0,
        wind_speed=10.0,
    )
    assert any("High humidity may increase fungal disease risk" in a for a in adv4)

    # 5. High wind speed >= 25 km/h
    adv5 = generate_farm_advisories(
        precipitation_sum=0.0,
        precipitation_probability=10.0,
        max_temp=28.0,
        humidity=50.0,
        wind_speed=30.0,
    )
    assert any("Strong wind expected" in a for a in adv5)

    # 6. Default / optimal conditions
    adv6 = generate_farm_advisories(
        precipitation_sum=0.0,
        precipitation_probability=10.0,
        max_temp=28.0,
        humidity=50.0,
        wind_speed=10.0,
    )
    assert adv6 == ["Weather conditions are generally suitable for routine farm activities."]


def test_advisories_capped_to_top_three():
    """Verify that multiple triggered rules are prioritized and capped to 3."""
    adv = generate_farm_advisories(
        precipitation_sum=10.0,
        precipitation_probability=85.0,
        max_temp=39.0,
        humidity=90.0,
        wind_speed=35.0,
    )
    assert len(adv) <= 3


@pytest.mark.asyncio
async def test_geocode_location_empty_query():
    """Verify empty or whitespace location query raises HTTP 400."""
    service = WeatherService()
    mock_client = AsyncMock()
    with pytest.raises(HTTPException) as exc_info:
        await service.geocode_location("   ", mock_client)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_geocode_location_not_found():
    """Verify unknown location query raises HTTP 404."""
    service = WeatherService()
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = {"results": []}
    mock_client.get.return_value = mock_response

    with pytest.raises(HTTPException) as exc_info:
        await service.geocode_location("NonExistentCityXYZ", mock_client)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_geocode_location_timeout():
    """Verify geocoding timeout raises HTTP 503."""
    service = WeatherService()
    mock_client = AsyncMock()
    mock_client.get.side_effect = httpx.TimeoutException("Timeout")

    with pytest.raises(HTTPException) as exc_info:
        await service.geocode_location("Pune", mock_client)
    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_fetch_forecast_data_provider_error():
    """Verify provider 500 error raises HTTP 502."""
    service = WeatherService()
    mock_client = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_client.get.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=mock_response
    )

    with pytest.raises(HTTPException) as exc_info:
        await service.fetch_forecast_data(18.52, 73.85, mock_client)
    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_get_weather_by_location_success():
    """Verify end-to-end weather retrieval and schema normalization."""
    service = WeatherService()

    fake_geo = {
        "name": "Pune",
        "country": "India",
        "admin1": "Maharashtra",
        "admin2": "Pune",
        "latitude": 18.5204,
        "longitude": 73.8567,
    }

    fake_forecast = {
        "current": {
            "temperature_2m": 29.5,
            "relative_humidity_2m": 72.0,
            "weather_code": 2,
            "wind_speed_10m": 12.4,
            "precipitation": 0.0,
        },
        "daily": {
            "weather_code": [2],
            "temperature_2m_max": [32.1],
            "temperature_2m_min": [22.4],
            "precipitation_sum": [4.5],
            "precipitation_probability_max": [65.0],
        },
    }

    with patch.object(service, "geocode_location", new=AsyncMock(return_value=fake_geo)), \
         patch.object(service, "fetch_forecast_data", new=AsyncMock(return_value=fake_forecast)):
        result = await service.get_weather_by_location("Pune")

    assert isinstance(result, WeatherResponse)
    assert result.location.name == "Pune"
    assert result.location.country == "India"
    assert result.location.state == "Maharashtra"
    assert result.location.latitude == 18.5204
    assert result.current.temperature == 29.5
    assert result.current.humidity == 72.0
    assert result.current.wind_speed == 12.4
    assert result.current.condition == "Partly cloudy"
    assert result.daily.temp_max == 32.1
    assert result.daily.temp_min == 22.4
    assert result.daily.precipitation_sum == 4.5
    assert result.daily.precipitation_probability == 65.0
    assert len(result.advisories) >= 1
    assert result.timestamp is not None
