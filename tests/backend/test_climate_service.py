"""Unit and integration tests for Climate Intelligence Service and Seasonal Climate API."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.climate_service import (
    get_current_season,
    get_seasonal_climate,
    SeasonalClimateUnavailableError,
    SEASON_CLIMATE_PROFILES,
    STATE_REGION_MAP,
    STATE_BASE_RAINFALL,
)
from app.schemas import SeasonalClimate, WeatherResponse
from model.crop_recommendation_v2.predict import predict_crop


@pytest.fixture
def client():
    return TestClient(app)


def test_get_current_season_mapping():
    """Verify standard Indian agricultural season determination from month."""
    assert get_current_season(month=6) == "Kharif"
    assert get_current_season(month=7) == "Kharif"
    assert get_current_season(month=8) == "Kharif"
    assert get_current_season(month=9) == "Kharif"
    assert get_current_season(month=10) == "Kharif"

    assert get_current_season(month=11) == "Rabi"
    assert get_current_season(month=12) == "Rabi"
    assert get_current_season(month=1) == "Rabi"
    assert get_current_season(month=2) == "Rabi"
    assert get_current_season(month=3) == "Rabi"

    assert get_current_season(month=4) == "Summer"
    assert get_current_season(month=5) == "Summer"


def test_get_seasonal_climate_gujarat():
    """Verify seasonal climate resolution for Gujarat (West region)."""
    # Gujarat Kharif: Base rain = 780.0, West Kharif rain factor = 0.7 -> 546.0 mm
    kharif = get_seasonal_climate(state="Gujarat", district="Ahmedabad", season="Kharif")
    assert isinstance(kharif, SeasonalClimate)
    assert kharif.season == "Kharif"
    assert kharif.region == "West"
    assert kharif.temperature_mean == 31.0
    assert kharif.humidity_mean == 72.0
    assert kharif.rainfall_normal == 546.0
    assert kharif.soil_type_default == "alluvial"

    # Gujarat Rabi: Base rain = 780.0, West Rabi rain factor = 0.03 -> 23.4 mm
    rabi = get_seasonal_climate(state="Gujarat", district="Ahmedabad", season="Rabi")
    assert rabi.season == "Rabi"
    assert rabi.temperature_mean == 22.0
    assert rabi.humidity_mean == 45.0
    assert rabi.rainfall_normal == 23.4

    # Gujarat Summer: Base rain = 780.0, West Summer rain factor = 0.02 -> 15.6 mm
    summer = get_seasonal_climate(state="Gujarat", district="Ahmedabad", season="Summer")
    assert summer.season == "Summer"
    assert summer.temperature_mean == 37.0
    assert summer.humidity_mean == 42.0
    assert summer.rainfall_normal == 15.6


def test_get_seasonal_climate_maharashtra():
    """Verify seasonal climate resolution for Maharashtra (Central region)."""
    # Maharashtra Kharif: Base rain = 1150.0, Central Kharif rain factor = 1.1 -> 1265.0 mm
    kharif = get_seasonal_climate(state="Maharashtra", district="Pune", season="Kharif")
    assert kharif.region == "Central"
    assert kharif.temperature_mean == 28.0
    assert kharif.humidity_mean == 82.0
    assert kharif.rainfall_normal == 1265.0
    assert kharif.soil_type_default == "black"


def test_get_seasonal_climate_punjab():
    """Verify seasonal climate resolution for Punjab (North region)."""
    # Punjab Rabi: Base rain = 650.0, North Rabi rain factor = 0.08 -> 52.0 mm
    rabi = get_seasonal_climate(state="Punjab", district="Ludhiana", season="Rabi")
    assert rabi.region == "North"
    assert rabi.temperature_mean == 15.5
    assert rabi.humidity_mean == 58.0
    assert rabi.rainfall_normal == 52.0
    assert rabi.soil_type_default == "alluvial"


def test_get_seasonal_climate_unknown_state_raises_error():
    """Verify unknown or unmapped states raise SeasonalClimateUnavailableError without fabricating data."""
    with pytest.raises(SeasonalClimateUnavailableError) as exc:
        get_seasonal_climate(state="Atlantis")
    assert "Verified seasonal climate data is unavailable" in str(exc.value)


def test_get_seasonal_climate_invalid_season_raises_error():
    """Verify invalid season strings raise SeasonalClimateUnavailableError."""
    with pytest.raises(SeasonalClimateUnavailableError) as exc:
        get_seasonal_climate(state="Gujarat", season="MonsoonAutumnWinter")
    assert "Unsupported agricultural season" in str(exc.value)


def test_api_seasonal_climate_endpoint(client):
    """Verify GET /api/seasonal-climate returns HTTP 200 with structured SeasonalClimate model."""
    response = client.get("/api/seasonal-climate?state=Gujarat&district=Ahmedabad&season=Kharif")
    assert response.status_code == 200
    data = response.json()
    assert data["season"] == "Kharif"
    assert data["region"] == "West"
    assert data["temperature_mean"] == 31.0
    assert data["humidity_mean"] == 72.0
    assert data["rainfall_normal"] == 546.0
    assert data["soil_type_default"] == "alluvial"


def test_api_seasonal_climate_404_on_unknown(client):
    """Verify GET /api/seasonal-climate returns HTTP 404 on unknown state without synthetic fallback."""
    response = client.get("/api/seasonal-climate?state=UnknownTerritory")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_rf_model_receives_exact_seasonal_values():
    """Verify Crop Recommendation RF model executes with exact seasonal climate values."""
    # Ahmedabad Kharif seasonal climate
    climate = get_seasonal_climate(state="Gujarat", district="Ahmedabad", season="Kharif")

    result = predict_crop(
        state="Gujarat",
        district="Ahmedabad",
        temperature=climate.temperature_mean,
        humidity=climate.humidity_mean,
        rainfall=climate.rainfall_normal,
        soil_type="Alluvial",
        previous_crop="wheat",
        top_k=3,
    )

    assert result["recommended_crop"] in ["rice", "maize", "cotton", "bajra", "groundnut", "wheat"]
    assert result["confidence"] > 0.0
    assert len(result["recommendations"]) == 3
    assert result["input_features"]["temperature"] == 31.0
    assert result["input_features"]["humidity"] == 72.0
    assert result["input_features"]["rainfall"] == 546.0
