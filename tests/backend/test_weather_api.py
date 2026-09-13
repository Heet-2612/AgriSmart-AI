"""API integration tests for /api/weather endpoint."""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
from app.main import app
from app.schemas import WeatherResponse, WeatherLocation, WeatherCurrent, WeatherDaily
from datetime import datetime, timezone


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_weather_response():
    return WeatherResponse(
        location=WeatherLocation(
            name="Ahmedabad",
            country="India",
            latitude=23.0225,
            longitude=72.5714,
            state="Gujarat",
            district="Ahmedabad",
        ),
        current=WeatherCurrent(
            temperature=31.2,
            humidity=64.0,
            wind_speed=14.0,
            weather_code=1,
            condition="Mainly clear",
            precipitation=0.0,
        ),
        daily=WeatherDaily(
            temp_min=24.0,
            temp_max=35.0,
            precipitation_sum=0.0,
            precipitation_probability=10.0,
        ),
        advisories=["Weather conditions are generally suitable for routine farm activities."],
        timestamp=datetime.now(timezone.utc),
    )


def test_get_weather_valid_location(client, sample_weather_response):
    """Verify GET /api/weather returns HTTP 200 with structured WeatherResponse payload."""
    with patch(
        "app.api.routes.weather.fetch_weather_by_location",
        new=AsyncMock(return_value=sample_weather_response),
    ):
        response = client.get("/api/weather?location=Ahmedabad")
        assert response.status_code == 200
        data = response.json()

        assert data["location"]["name"] == "Ahmedabad"
        assert data["location"]["country"] == "India"
        assert data["current"]["temperature"] == 31.2
        assert data["current"]["humidity"] == 64.0
        assert data["current"]["condition"] == "Mainly clear"
        assert "advisories" in data
        assert len(data["advisories"]) > 0


def test_get_weather_missing_location_query(client):
    """Verify omitting location query parameter returns HTTP 422."""
    response = client.get("/api/weather")
    assert response.status_code == 422


def test_get_weather_empty_location_query(client):
    """Verify empty location parameter raises HTTP 400."""
    with patch(
        "app.api.routes.weather.fetch_weather_by_location",
        side_effect=HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Location parameter cannot be empty."),
    ):
        response = client.get("/api/weather?location=%20%20")
        assert response.status_code == 400
        assert "Location parameter cannot be empty" in response.json()["detail"]


def test_get_weather_location_not_found(client):
    """Verify unknown location raises HTTP 404."""
    with patch(
        "app.api.routes.weather.fetch_weather_by_location",
        side_effect=HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location 'UnknownCity' not found."),
    ):
        response = client.get("/api/weather?location=UnknownCity")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


def test_get_weather_provider_unavailable(client):
    """Verify weather provider timeout / outage returns HTTP 503."""
    with patch(
        "app.api.routes.weather.fetch_weather_by_location",
        side_effect=HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Weather service timed out."),
    ):
        response = client.get("/api/weather?location=Pune")
        assert response.status_code == 503
        assert "timed out" in response.json()["detail"]
