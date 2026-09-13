"""Backend tests for Live Weather API and Open-Meteo Integration."""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
import httpx
from app.main import app

client = TestClient(app)


def test_weather_empty_location_returns_400():
    """Verify empty or whitespace location query is rejected with 400."""
    res = client.get("/api/weather?location=")
    assert res.status_code == 400 or res.status_code == 422


@pytest.mark.asyncio
async def test_weather_successful_mocked_fetch():
    """Verify successful weather fetch, structure, and farm advisory generation."""
    mock_geo_resp = {
        "results": [
            {
                "name": "Ludhiana",
                "country": "India",
                "latitude": 30.9,
                "longitude": 75.85,
            }
        ]
    }
    mock_forecast_resp = {
        "current": {
            "temperature_2m": 28.5,
            "relative_humidity_2m": 82,
            "wind_speed_10m": 12.0,
            "weather_code": 61,
        },
        "daily": {
            "temperature_2m_min": [20.0],
            "temperature_2m_max": [31.0],
            "precipitation_sum": [12.5],
            "precipitation_probability_max": [80],
        },
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_res1 = AsyncMock()
        mock_res1.status_code = 200
        mock_res1.raise_for_status = lambda: None
        mock_res1.json = lambda: mock_geo_resp

        mock_res2 = AsyncMock()
        mock_res2.status_code = 200
        mock_res2.raise_for_status = lambda: None
        mock_res2.json = lambda: mock_forecast_resp

        mock_get.side_effect = [mock_res1, mock_res2]

        res = client.get("/api/weather?location=Ludhiana")
        assert res.status_code == 200
        data = res.json()

        assert data["location"]["name"] == "Ludhiana"
        assert data["current"]["temperature"] == 28.5
        assert data["current"]["humidity"] == 82
        assert data["daily"]["precipitation_sum"] == 12.5
        assert data["daily"]["precipitation_probability"] == 80
        assert len(data["advisories"]) > 0
        assert any("postpone irrigation" in adv.lower() for adv in data["advisories"])


@pytest.mark.asyncio
async def test_weather_location_not_found_returns_404():
    """Verify non-existent location returns 404 without fabricating data."""
    mock_geo_resp = {"results": []}

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_res = AsyncMock()
        mock_res.status_code = 200
        mock_res.raise_for_status = lambda: None
        mock_res.json = lambda: mock_geo_resp
        mock_get.return_value = mock_res

        res = client.get("/api/weather?location=NonExistentCityXYZ123")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_weather_upstream_timeout_returns_503():
    """Verify upstream weather provider timeout gracefully returns 503."""
    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Mocked timeout")):
        res = client.get("/api/weather?location=Pune")
        assert res.status_code == 503
        assert "timed out" in res.json()["detail"].lower()
