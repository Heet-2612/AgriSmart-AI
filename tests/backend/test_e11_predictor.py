import hashlib
import io
import os
import tempfile
from pathlib import Path
from PIL import Image
import numpy as np
import pytest
import torch
from torchvision import transforms
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.predictor_contract import (
    DefaultPredictor,
    PredictionOutput,
    normalize_prediction_output,
)
from model.inference.preprocessing import (
    siglip_transform,
    preprocess_image_tensor,
    SIGLIP_IMAGE_SIZE,
    SIGLIP_MEAN,
    SIGLIP_STD,
)
from model.inference.predict import (
    predict,
    get_predictor,
    E11SigLIPPredictor,
    HYBRID10_CLASSES,
    ModelNotReadyError,
)

EXPECTED_PRODUCTION_SHA256 = "a51d814fc434c514743180a9df596d6a5aa6d250e7b3e496dd5927fdea6c64df"
CHECKPOINT_PATH = Path("model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt")

EXPECTED_HYBRID10_ORDER = [
    "Potato Early Blight",
    "Potato Late Blight",
    "Potato Healthy",
    "Corn Gray Leaf Spot",
    "Corn Healthy",
    "Tomato Yellow Leaf Curl Virus",
    "Tomato Healthy",
    "Apple Scab",
    "Apple Cedar Rust",
    "Apple Healthy",
]


@pytest.fixture
def sample_leaf_image(tmp_path):
    """Create a synthetic test image."""
    img_path = tmp_path / "test_leaf.jpg"
    img = Image.new("RGB", (300, 300), color=(45, 120, 35))
    img.save(img_path)
    return img_path


def test_1_predictor_imports_successfully():
    """Verify that all E11 inference symbols import cleanly."""
    assert predict is not None
    assert get_predictor is not None
    assert E11SigLIPPredictor is not None
    assert HYBRID10_CLASSES is not None


def test_2_checkpoint_exists():
    """Verify the production checkpoint exists at the specified path."""
    assert CHECKPOINT_PATH.exists(), f"Production checkpoint missing at {CHECKPOINT_PATH}"
    assert CHECKPOINT_PATH.is_file()


def test_3_checkpoint_sha_matches_expected():
    """Verify checkpoint SHA-256 matches the authorized Option C hash."""
    h = hashlib.sha256()
    with open(CHECKPOINT_PATH, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    actual_sha = h.hexdigest()
    assert actual_sha == EXPECTED_PRODUCTION_SHA256, (
        f"SHA-256 mismatch: got {actual_sha}, expected {EXPECTED_PRODUCTION_SHA256}"
    )


def test_4_model_loads_successfully():
    """Verify E11 SigLIP model instantiates and loads weights cleanly."""
    predictor = get_predictor(CHECKPOINT_PATH)
    assert predictor is not None
    assert predictor.model is not None
    assert isinstance(predictor.model.classifier, torch.nn.Linear)


def test_5_model_has_exactly_10_outputs():
    """Verify classification head has exactly 768 in_features and 10 out_features."""
    predictor = get_predictor(CHECKPOINT_PATH)
    classifier = predictor.model.classifier
    assert classifier.in_features == 768
    assert classifier.out_features == 10


def test_6_and_7_output_probabilities_finite_and_sum_to_one(sample_leaf_image):
    """Verify inference output probabilities are finite and sum to 1.0."""
    result = predict(sample_leaf_image, checkpoint_path=CHECKPOINT_PATH)
    probs = result["probabilities"]
    assert len(probs) == 10
    for cname, pval in probs.items():
        assert np.isfinite(pval), f"Probability for {cname} is not finite: {pval}"
        assert 0.0 <= pval <= 1.0, f"Probability for {cname} out of bounds: {pval}"

    total_prob = sum(probs.values())
    assert pytest.approx(1.0, abs=1e-3) == total_prob


def test_8_returned_class_is_one_of_ten_classes(sample_leaf_image):
    """Verify the top predicted class belongs to the official HYBRID-10 taxonomy."""
    result = predict(sample_leaf_image, checkpoint_path=CHECKPOINT_PATH)
    pred_class = result["predicted_class"]
    assert pred_class in HYBRID10_CLASSES
    assert result["confidence"] == pytest.approx(result["probabilities"][pred_class], abs=1e-4)


def test_9_class_ordering_is_exactly_correct():
    """Verify HYBRID-10 class ordering is exactly preserved and not alphabetically sorted."""
    assert list(HYBRID10_CLASSES) == EXPECTED_HYBRID10_ORDER
    # Explicitly confirm index 0 is Potato Early Blight, not Apple
    assert HYBRID10_CLASSES[0] == "Potato Early Blight"
    assert HYBRID10_CLASSES[9] == "Apple Healthy"


def test_10_siglip_preprocessing_specification():
    """Verify SigLIP preprocessing configuration (224x224 bicubic, mean=0.5, std=0.5)."""
    assert SIGLIP_IMAGE_SIZE == (224, 224)
    assert SIGLIP_MEAN == [0.5, 0.5, 0.5]
    assert SIGLIP_STD == [0.5, 0.5, 0.5]

    resize_tf = siglip_transform.transforms[0]
    norm_tf = siglip_transform.transforms[2]

    assert resize_tf.size == (224, 224)
    assert resize_tf.interpolation == transforms.InterpolationMode.BICUBIC
    assert norm_tf.mean == [0.5, 0.5, 0.5]
    assert norm_tf.std == [0.5, 0.5, 0.5]


def test_11_rgb_conversion_works(tmp_path):
    """Verify non-RGB images (RGBA and Grayscale) convert to 3-channel SigLIP tensors."""
    rgba_path = tmp_path / "rgba_leaf.png"
    Image.new("RGBA", (200, 200), color=(50, 100, 50, 255)).save(rgba_path)
    t_rgba = preprocess_image_tensor(rgba_path)
    assert t_rgba.shape == (1, 3, 224, 224)

    gray_path = tmp_path / "gray_leaf.png"
    Image.new("L", (200, 200), color=128).save(gray_path)
    t_gray = preprocess_image_tensor(gray_path)
    assert t_gray.shape == (1, 3, 224, 224)


def test_12_default_predictor_produces_valid_prediction_output(sample_leaf_image):
    """Verify DefaultPredictor returns conforming PredictionOutput dataclass."""
    predictor = DefaultPredictor(checkpoint_path=str(CHECKPOINT_PATH))
    output = predictor.predict(sample_leaf_image)

    assert isinstance(output, PredictionOutput)
    assert output.predicted_class in HYBRID10_CLASSES
    assert 0.0 <= output.confidence <= 1.0
    assert len(output.probabilities) == 10
    assert output.model_version == "E11-SigLIP-HYBRID10-PRODUCTION"


def test_13_missing_checkpoint_produces_graceful_model_not_ready(sample_leaf_image, tmp_path):
    """Verify that a missing checkpoint path raises ModelNotReadyError."""
    fake_ckpt = tmp_path / "missing_siglip_weights.pt"
    with pytest.raises(ModelNotReadyError):
        predict(sample_leaf_image, checkpoint_path=fake_ckpt)


def test_14_end_to_end_api_prediction_with_e11(sample_leaf_image):
    """Verify live POST /api/predictions endpoint executes end-to-end with E11 predictor."""
    client = TestClient(app)
    with open(sample_leaf_image, "rb") as f:
        response = client.post(
            "/api/predictions",
            files={"image": ("leaf.jpg", f, "image/jpeg")},
        )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()

    assert body["predicted_class"] in HYBRID10_CLASSES
    assert 0.0 <= body["confidence"] <= 1.0
    assert len(body["probabilities"]) == 10
    assert body["display_name"] is not None
    assert body["model_version"] == "E11-SigLIP-HYBRID10-PRODUCTION"
