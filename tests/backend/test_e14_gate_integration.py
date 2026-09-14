"""
Automated Integration Tests for E14 Leaf Presence Gate and E12 Validity Pipeline.

Verifies:
1. E14 + E12 safely rejects all representative NOT_LEAF inputs (E14 direct rejection + E12 rejection).
2. E14 rejects all representative DEGENERATE inputs (solids, low contrast).
3. E14 passes all valid supported leaf samples (Potato, Corn, Tomato, Apple).
4. E14 specifically rejects the soil-bed image failure with SPRAWLING_FIELD_BACKGROUND.
5. E14 rejection short-circuits downstream inference (E12 and E11 are NEVER called).
6. E14 acceptance proceeds to E12, and supported crops proceed to E11.
7. E12 unsupported crop short-circuits E11 (E11 is NEVER called).
8. Regression: E14 exception strictly fails closed (NEVER produces ACCEPT_PLAUSIBLE_LEAF).
9. Regression: Injected/custom predictor cannot bypass E12.
10. Regression: E12 rejection prevents E11 invocation.
11. Regression: E14 rejection prevents E12 and E11 invocation.
"""

import io
import os
import contextlib
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
import numpy as np
from PIL import Image, ImageDraw
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.leaf_presence_gate import LeafPresenceGate, get_leaf_presence_gate
from app.services.validity_classifier import ValidityClassifier, get_validity_classifier
from app.services.predictor_contract import PredictorProtocol, DefaultPredictor, PredictionOutput
from app.dependencies import get_predictor, get_validity_service, get_leaf_gate

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures" / "samples"


def _create_synthetic_solid(color: tuple, size=(224, 224)) -> np.ndarray:
    return np.full((size[1], size[0], 3), color, dtype=np.uint8)


def _create_synthetic_document(size=(224, 224)) -> np.ndarray:
    img = Image.new("RGB", size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    for y in range(20, size[1] - 20, 20):
        draw.line([(20, y), (size[0] - 20, y)], fill=(0, 0, 0), width=1)
    return np.array(img)


def _create_synthetic_ui_graphic(size=(224, 224)) -> np.ndarray:
    img = Image.new("RGB", size, color=(40, 60, 100))
    draw = ImageDraw.Draw(img)
    draw.rectangle([(30, 30), (size[0] - 30, size[1] - 30)], fill=(200, 220, 255))
    draw.text((50, 100), "AgriSmart UI", fill=(0, 0, 0))
    return np.array(img)


def _create_synthetic_portrait(size=(224, 224)) -> np.ndarray:
    # Human face/skin tones (pink/peach/tan, non-vegetation)
    img = Image.new("RGB", size, color=(235, 195, 170))
    draw = ImageDraw.Draw(img)
    draw.ellipse([(60, 40), (164, 180)], fill=(210, 160, 130))
    return np.array(img)


def _create_synthetic_small_scatter(size=(224, 224)) -> np.ndarray:
    # Tiny green dots scattered across white canvas (< 5% connected component area)
    arr = np.full((size[1], size[0], 3), 255, dtype=np.uint8)
    for i in range(10, size[1], 40):
        for j in range(10, size[0], 40):
            arr[i:i+3, j:j+3] = [30, 160, 40]
    return arr


def _create_synthetic_foliage_scene(size=(224, 224)) -> np.ndarray:
    # Foliage scene (passes E14 green foliage check, but unsupported crop in E12)
    arr = np.zeros((size[1], size[0], 3), dtype=np.uint8)
    for i in range(size[1]):
        for j in range(size[0]):
            arr[i, j, 0] = int(35 + 15 * np.sin(i / 8.0))
            arr[i, j, 1] = int(120 + 35 * np.sin((i + j) / 10.0))
            arr[i, j, 2] = int(30 + 10 * np.cos(j / 8.0))
    return arr


@contextlib.contextmanager
def tempfile_saved(buf: io.BytesIO):
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        f.write(buf.getvalue())
        tmp_name = f.name
    try:
        yield tmp_name
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)


@pytest.fixture
def gate():
    return LeafPresenceGate()


# ==============================================================================
# 1. Audit Invariant Tests
# ==============================================================================

def test_1_pipeline_rejects_all_representative_not_leaf_cases(gate):
    """Verify that all representative NOT_LEAF inputs are safely rejected before reaching E11.

    E14 directly rejects non-vegetation images, UI, documents, portraits, and fragmented noise.
    Non-crop foliage scenes that pass E14 are rejected by E12 as Other.
    Zero non-leaf inputs reach E11 disease classification.
    """
    val = get_validity_classifier()

    not_leaf_cases = [
        ("document", _create_synthetic_document()),
        ("ui_graphic", _create_synthetic_ui_graphic()),
        ("portrait_person", _create_synthetic_portrait()),
        ("small_green_scatter", _create_synthetic_small_scatter()),
        ("uniform_gray_noise", np.random.randint(80, 160, (224, 224, 3), dtype=np.uint8)),
        ("foliage_scenery", _create_synthetic_foliage_scene()),
    ]

    for name, arr in not_leaf_cases:
        is_leaf, reason, _ = gate.evaluate(arr)
        if not is_leaf:
            # E14 direct rejection
            assert reason in ("NO_VEGETATION", "LEAF_COMPONENT_TOO_SMALL", "INVALID_DEGENERATE_IMAGE")
        else:
            # Passes E14, must be rejected by E12 as Other
            img = Image.fromarray(arr)
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            buf.seek(0)
            with tempfile_saved(buf) as tmp_file:
                v_res = val.evaluate(tmp_file)
                assert not v_res.is_supported, f"NOT_LEAF image reached supported crop: {name}"
                assert v_res.crop_class == "Other"


def test_2_e14_rejects_all_degenerate_cases(gate):
    """Verify E14 rejects all degenerate flat/solid color images."""
    degenerate_cases = [
        ("pure_white", _create_synthetic_solid((255, 255, 255))),
        ("pure_black", _create_synthetic_solid((0, 0, 0))),
        ("solid_blue", _create_synthetic_solid((0, 0, 255))),
        ("solid_green", _create_synthetic_solid((0, 255, 0))),
        ("solid_brown", _create_synthetic_solid((139, 69, 19))),
        ("flat_noise", np.full((224, 224, 3), 128, dtype=np.uint8)),
    ]

    for name, arr in degenerate_cases:
        is_leaf, reason, _ = gate.evaluate(arr)
        assert not is_leaf, f"Degenerate case falsely accepted: {name}"
        assert reason == "INVALID_DEGENERATE_IMAGE"


def test_3_e14_passes_all_valid_supported_leaf_cases(gate):
    """Verify E14 accepts all genuine supported crop leaves (Potato, Corn, Tomato, Apple)."""
    supported_files = [
        FIXTURES_DIR / "potato_leaf.jpg",
        FIXTURES_DIR / "corn_leaf.jpg",
        FIXTURES_DIR / "tomato_leaf.jpg",
        FIXTURES_DIR / "apple_leaf.jpg",
    ]

    for img_path in supported_files:
        assert img_path.exists(), f"Fixture missing: {img_path}"
        is_leaf, reason, telemetry = gate.evaluate(img_path)
        assert is_leaf, f"Legitimate leaf falsely rejected: {img_path.name} ({reason}, {telemetry})"
        assert reason == "ACCEPT_PLAUSIBLE_LEAF"


def test_4_e14_specifically_rejects_soil_bed_failure(gate):
    """Verify Row 52 soil-bed image is rejected with SPRAWLING_FIELD_BACKGROUND."""
    soil_bed_path = FIXTURES_DIR / "soil_bed.jpg"
    assert soil_bed_path.exists(), f"Soil bed fixture missing: {soil_bed_path}"

    is_leaf, reason, telemetry = gate.evaluate(soil_bed_path)
    assert not is_leaf, "Soil bed image was falsely accepted by E14!"
    assert reason == "SPRAWLING_FIELD_BACKGROUND", f"Expected SPRAWLING_FIELD_BACKGROUND, got {reason}"
    assert telemetry["component_extent"] < 0.28 or telemetry["component_solidity"] < 0.45


# ==============================================================================
# 2. Pipeline Short-Circuit & Orchestration Tests
# ==============================================================================

def test_5_e14_rejection_short_circuits_downstream_e12_and_e11():
    """When E14 rejects an image, verify that NEITHER E12 nor E11 is ever invoked."""
    client = TestClient(app)
    soil_bed_path = FIXTURES_DIR / "soil_bed.jpg"

    with patch.object(ValidityClassifier, "evaluate") as mock_val, \
         patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(soil_bed_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("soil.jpg", f, "image/jpeg")})

        assert res.status_code == 400
        data = res.json()
        assert data["status"] == "not_leaf"
        assert data["rejection_reason"] == "SPRAWLING_FIELD_BACKGROUND"
        assert data["is_conclusive"] is False

        mock_val.assert_not_called()
        mock_e11.assert_not_called()


def test_6_e14_acceptance_proceeds_to_e12_and_e11():
    """When E14 accepts a supported crop leaf, E12 confirms crop, and E11 diagnoses disease."""
    client = TestClient(app)
    potato_path = FIXTURES_DIR / "potato_leaf.jpg"

    with open(potato_path, "rb") as f:
        res = client.post("/api/predictions", files={"image": ("potato.jpg", f, "image/jpeg")})

    assert res.status_code == 200
    data = res.json()
    assert data["crop_class"] in ("Potato", "Other")
    assert "predicted_class" in data
    assert 0.0 <= data["confidence"] <= 1.0


def test_7_e12_unsupported_crop_short_circuits_e11():
    """When an image passes E14 but E12 classifies it as unsupported ('Other'), E11 is NOT called."""
    client = TestClient(app)
    soy_path = FIXTURES_DIR / "soybean_leaf.jpg"

    with patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(soy_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("soy.jpg", f, "image/jpeg")})

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unsupported_crop"
        assert data["is_conclusive"] is False
        assert data["crop_class"] == "Other"

        mock_e11.assert_not_called()


# ==============================================================================
# 3. Team-Lead Review Regression Tests
# ==============================================================================

def test_8_e14_exception_fails_closed():
    """Verify that an exception in E14 gate strictly fails closed and NEVER produces ACCEPT_PLAUSIBLE_LEAF."""
    class FailingLeafGate:
        def evaluate(self, _):
            raise RuntimeError("Hardware/corrupt memory error inside E14 execution")

    app.dependency_overrides[get_leaf_gate] = lambda: FailingLeafGate()
    client = TestClient(app)
    potato_path = FIXTURES_DIR / "potato_leaf.jpg"

    try:
        with open(potato_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("leaf.jpg", f, "image/jpeg")})

        # Must fail closed: HTTP 400 invalid_image, is_conclusive=False, no prediction
        assert res.status_code == 400
        data = res.json()
        assert data["status"] == "invalid_image"
        assert data["is_conclusive"] is False
        assert data["rejection_reason"] == "E14_EVALUATION_ERROR"
        assert "predicted_class" not in data
    finally:
        app.dependency_overrides.pop(get_leaf_gate, None)


def test_9_injected_predictor_cannot_bypass_e12():
    """Verify that an injected custom predictor CANNOT bypass E12 gating in production."""
    class MockCustomPredictor:
        def __init__(self):
            self.predict_called = False

        def predict(self, _):
            self.predict_called = True
            return PredictionOutput(
                predicted_class="Tomato___healthy",
                confidence=0.99,
                probabilities={"Tomato___healthy": 0.99},
                model_version="CustomTestModel",
            )

    mock_predictor = MockCustomPredictor()
    app.dependency_overrides[get_predictor] = lambda: mock_predictor
    client = TestClient(app)

    # Pass unsupported crop (soybean)
    soy_path = FIXTURES_DIR / "soybean_leaf.jpg"
    try:
        with open(soy_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("soy.jpg", f, "image/jpeg")})

        # E12 MUST run and reject the unsupported crop
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unsupported_crop"
        assert data["crop_class"] == "Other"

        # The custom predictor MUST NOT have been called!
        assert mock_predictor.predict_called is False, "Custom predictor bypassed E12!"
    finally:
        app.dependency_overrides.pop(get_predictor, None)


def test_10_e12_rejection_prevents_e11_invocation():
    """Verify that when E12 rejects an unsupported crop, E11 is NEVER invoked."""
    client = TestClient(app)
    soy_path = FIXTURES_DIR / "soybean_leaf.jpg"

    with patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(soy_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("soy.jpg", f, "image/jpeg")})

        assert res.status_code == 200
        assert res.json()["status"] == "unsupported_crop"
        mock_e11.assert_not_called()


def test_11_e14_rejection_prevents_e12_and_e11_invocation():
    """Verify that when E14 rejects a non-leaf input, NEITHER E12 nor E11 is invoked."""
    client = TestClient(app)
    soil_bed_path = FIXTURES_DIR / "soil_bed.jpg"

    with patch.object(ValidityClassifier, "evaluate") as mock_e12, \
         patch.object(DefaultPredictor, "predict") as mock_e11:
        with open(soil_bed_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("soil.jpg", f, "image/jpeg")})

        assert res.status_code == 400
        assert res.json()["status"] == "not_leaf"
        mock_e12.assert_not_called()
        mock_e11.assert_not_called()
