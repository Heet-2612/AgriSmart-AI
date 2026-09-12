"""
Backend Test Suite for Bonus Module: Crop Recommendation.

Tests request validation, boundary handling, 503 unavailability behavior,
and deterministic probability ranking with an isolated test model.
"""

import os
import json
import tempfile
import pytest
from httpx import AsyncClient, ASGITransport
from sklearn.ensemble import RandomForestClassifier
import joblib

from app.main import app
from app.config import settings
from app.services.crop_recommendation_service import reset_model_cache


@pytest.fixture(autouse=True)
def clean_model_cache():
    """Ensure in-memory cache is reset before and after every test."""
    reset_model_cache()
    yield
    reset_model_cache()


@pytest.fixture
def mock_crop_model(tmp_path):
    """
    Creates an isolated temporary trained scikit-learn model artifact
    and configures settings to point to it during test execution.
    """
    # 4 distinct crop classes with known deterministic feature separation
    X_synthetic = [
        [90.0, 42.0, 43.0, 20.87, 82.0, 6.5, 202.93],  # rice
        [95.0, 45.0, 40.0, 22.00, 80.0, 6.2, 210.00],  # rice
        [20.0, 60.0, 20.0, 24.00, 60.0, 6.0, 70.00],   # maize
        [25.0, 65.0, 22.0, 25.00, 58.0, 5.8, 75.00],   # maize
        [80.0, 40.0, 40.0, 25.00, 78.0, 6.8, 160.00],  # jute
        [85.0, 42.0, 38.0, 26.00, 75.0, 6.9, 155.00],  # jute
        [10.0, 20.0, 30.0, 28.00, 40.0, 7.5, 40.00],   # coffee
        [12.0, 22.0, 32.0, 27.50, 42.0, 7.2, 45.00],   # coffee
    ]
    y_synthetic = ["rice", "rice", "maize", "maize", "jute", "jute", "coffee", "coffee"]

    clf = RandomForestClassifier(n_estimators=10, random_state=42)
    clf.fit(X_synthetic, y_synthetic)

    model_file = tmp_path / "test_crop_model.joblib"
    metadata_file = tmp_path / "test_metadata.json"

    joblib.dump(clf, str(model_file))

    metadata = {
        "model_version": "v1.0.0-test-rf",
        "algorithm": "RandomForestClassifier",
        "features": ["nitrogen", "phosphorus", "potassium", "temperature", "humidity", "ph", "rainfall"],
        "classes": clf.classes_.tolist(),
    }
    with open(str(metadata_file), "w", encoding="utf-8") as f:
        json.dump(metadata, f)

    original_model_path = settings.CROP_MODEL_PATH
    original_meta_path = settings.CROP_METADATA_PATH

    settings.CROP_MODEL_PATH = str(model_file)
    settings.CROP_METADATA_PATH = str(metadata_file)

    yield clf

    settings.CROP_MODEL_PATH = original_model_path
    settings.CROP_METADATA_PATH = original_meta_path


# ---------------------------------------------------------------------------
# 1. Model Unavailable (HTTP 503) Behavior Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crop_recommendation_returns_503_when_model_missing():
    """Verify endpoint returns 503 when model artifact does not exist."""
    settings.CROP_MODEL_PATH = "non_existent_path/crop_model.joblib"
    reset_model_cache()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/crop-recommendation",
            json={
                "nitrogen": 90.0,
                "phosphorus": 42.0,
                "potassium": 43.0,
                "temperature": 20.87,
                "humidity": 82.0,
                "ph": 6.5,
                "rainfall": 202.93,
            },
        )

        assert response.status_code == 503
        data = response.json()
        assert "not available" in data["detail"].lower()


# ---------------------------------------------------------------------------
# 2. Pydantic Input Validation Tests (HTTP 422)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "invalid_payload,expected_error_field",
    [
        # Negative nutrients
        ({"nitrogen": -1.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": 100.0}, "nitrogen"),
        ({"nitrogen": 90.0, "phosphorus": -5.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": 100.0}, "phosphorus"),
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": -10.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": 100.0}, "potassium"),
        # Negative rainfall
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": -0.1}, "rainfall"),
        # Humidity boundaries
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": -0.1, "ph": 6.5, "rainfall": 100.0}, "humidity"),
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 100.1, "ph": 6.5, "rainfall": 100.0}, "humidity"),
        # pH boundaries
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": -0.1, "rainfall": 100.0}, "ph"),
        ({"nitrogen": 90.0, "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 14.1, "rainfall": 100.0}, "ph"),
        # Missing fields
        ({"phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": 100.0}, "nitrogen"),
        # Non-numeric string
        ({"nitrogen": "invalid", "phosphorus": 40.0, "potassium": 40.0, "temperature": 25.0, "humidity": 80.0, "ph": 6.5, "rainfall": 100.0}, "nitrogen"),
    ],
)
async def test_crop_recommendation_input_validation_errors(invalid_payload, expected_error_field):
    """Verify endpoint rejects out-of-range, negative, and malformed inputs with 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/crop-recommendation", json=invalid_payload)
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        error_locs = [err["loc"][-1] for err in data["detail"]]
        assert expected_error_field in error_locs


# ---------------------------------------------------------------------------
# 3. Successful Inference & Output Verification Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crop_recommendation_valid_prediction_structure(mock_crop_model):
    """Verify successful inference response adheres to contract schemas."""
    payload = {
        "nitrogen": 90.0,
        "phosphorus": 42.0,
        "potassium": 43.0,
        "temperature": 20.87,
        "humidity": 82.0,
        "ph": 6.5,
        "rainfall": 202.93,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/crop-recommendation", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "recommended_crop" in data
        assert "confidence" in data
        assert "top_3_recommendations" in data
        assert "input_summary" in data
        assert "model_version" in data
        assert data["model_version"] == "v1.0.0-test-rf"

        # Check top-3 list
        top_3 = data["top_3_recommendations"]
        assert len(top_3) <= 3
        assert len(top_3) >= 1
        assert data["recommended_crop"] == top_3[0]["crop"]
        assert data["confidence"] == top_3[0]["confidence"]

        # Confidences must be sorted descending
        for i in range(len(top_3) - 1):
            assert top_3[i]["confidence"] >= top_3[i + 1]["confidence"]

        # Echoed input summary check
        summary = data["input_summary"]
        assert summary["nitrogen"] == payload["nitrogen"]
        assert summary["phosphorus"] == payload["phosphorus"]
        assert summary["potassium"] == payload["potassium"]
        assert summary["temperature"] == payload["temperature"]
        assert summary["humidity"] == payload["humidity"]
        assert summary["ph"] == payload["ph"]
        assert summary["rainfall"] == payload["rainfall"]


@pytest.mark.asyncio
async def test_crop_recommendation_boundary_zero_values(mock_crop_model):
    """Verify valid boundary values (e.g. 0 NPK, 0 rainfall, 0/100 humidity, 0/14 pH) are accepted."""
    payload = {
        "nitrogen": 0.0,
        "phosphorus": 0.0,
        "potassium": 0.0,
        "temperature": -5.0,
        "humidity": 0.0,
        "ph": 0.0,
        "rainfall": 0.0,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/crop-recommendation", json=payload)
        assert response.status_code == 200
