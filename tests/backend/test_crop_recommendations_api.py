"""API integration tests for Crop Recommendation endpoint."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from model.crop_recommendation_v2.predict import ModelNotReadyError
from unittest.mock import patch

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def valid_payload():
    return {
        "state": "Gujarat",
        "district": "Ahmedabad",
        "temperature": 28.0,
        "humidity": 65.0,
        "rainfall": 750.0,
        "soil_type": "alluvial",
        "previous_crop": "cotton",
        "top_k": 3,
    }

def test_crop_recommendation_valid_request(client, valid_payload):
    """Verify POST /api/crop-recommendations returns HTTP 200 with complete response schema."""
    response = client.post("/api/crop-recommendations", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "recommended_crop" in data
    assert "confidence" in data
    assert "top_k_recommendations" in data
    assert "model_version" in data
    assert "input_features" in data
    assert "explanation" in data
    assert "confidence_level" in data
    
    assert isinstance(data["recommended_crop"], str)
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["top_k_recommendations"]) == 3
    assert data["top_k_recommendations"][0]["crop"] == data["recommended_crop"]
    assert data["top_k_recommendations"][0]["probability"] == data["confidence"]

def test_crop_recommendation_custom_top_k(client, valid_payload):
    """Verify custom top_k parameter returns the requested number of ranked items."""
    valid_payload["top_k"] = 5
    response = client.post("/api/crop-recommendations", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["top_k_recommendations"]) == 5
    probs = [item["probability"] for item in data["top_k_recommendations"]]
    assert probs == sorted(probs, reverse=True)

@pytest.mark.parametrize("field, invalid_val", [
    ("state", ""),
    ("district", ""),
    ("soil_type", "unknown_soil"),
    ("previous_crop", ""),
    ("temperature", -20.0),
    ("temperature", 80.0),
    ("humidity", -5.0),
    ("humidity", 105.0),
    ("rainfall", -50.0),
    ("top_k", 0),
    ("top_k", 50),
    ("rainfall", "heavy_rain"),
])
def test_crop_recommendation_invalid_values(client, valid_payload, field, invalid_val):
    """Verify invalid numeric ranges and types are rejected with HTTP 422."""
    valid_payload[field] = invalid_val
    response = client.post("/api/crop-recommendations", json=valid_payload)
    assert response.status_code in (400, 422)
    assert "detail" in response.json()

@pytest.mark.parametrize("missing_field", [
    "state", "district", "soil_type", "previous_crop", "temperature", "humidity", "rainfall"
])
def test_crop_recommendation_missing_fields(client, valid_payload, missing_field):
    """Verify omitting any required field returns HTTP 422."""
    del valid_payload[missing_field]
    response = client.post("/api/crop-recommendations", json=valid_payload)
    assert response.status_code == 422
    assert any(missing_field in str(err) for err in response.json().get("detail", []))

def test_crop_recommendation_model_unavailable(client, valid_payload):
    """Verify that when model is unavailable, API returns HTTP 503 without leaking stack traces."""
    with patch(
        "app.services.crop_recommendation_service.predict_crop",
        side_effect=ModelNotReadyError("Model checkpoint not found.")
    ):
        response = client.post("/api/crop-recommendations", json=valid_payload)
        assert response.status_code == 503
        body = response.json()
        assert "detail" in body
        assert "Crop recommendation model is not available" in body["detail"]
        # Ensure no internal path or traceback leak
        assert "Traceback" not in str(body)

def test_crop_recommendation_unexpected_inference_error(client, valid_payload):
    """Verify unexpected errors return HTTP 500 with generic safe error message."""
    with patch(
        "app.services.crop_recommendation_service.predict_crop",
        side_effect=RuntimeError("Low-level tensor memory failure")
    ):
        response = client.post("/api/crop-recommendations", json=valid_payload)
        assert response.status_code == 500
        body = response.json()
        assert "detail" in body
        assert body["detail"] == "An unexpected error occurred during crop recommendation inference."
