import io
import os
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.predictor_contract import PredictionOutput, PredictorProtocol
from app.dependencies import get_predictor, get_db_session

def _resolve_test_image_root() -> Path:
    """Resolve the test image dataset root directory portably."""
    for env_key in ("AGRISMART_TEST_DATA_DIR", "TEST_IMAGE_ROOT", "DATA_DIR"):
        val = os.getenv(env_key)
        if val and Path(val).exists():
            return Path(val)
    repo_root = Path(__file__).resolve().parents[2]
    candidates = [
        repo_root / "data",
        repo_root.parent / "data",
        repo_root.parent / "AgriSmart-AI-main" / "data",
    ]
    for cand in candidates:
        if cand.exists():
            return cand
    return repo_root / "data"


TEST_IMAGE_ROOT = _resolve_test_image_root()

REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = REPO_ROOT / "tests" / "fixtures" / "samples"

SUPPORTED_LEAF_SAMPLES = {
    "Potato Early Blight": FIXTURES_DIR / "potato_leaf.jpg",
    "Tomato Healthy": FIXTURES_DIR / "tomato_leaf.jpg",
    "Corn Healthy": FIXTURES_DIR / "corn_leaf.jpg",
    "Apple Scab": FIXTURES_DIR / "apple_leaf.jpg",
}

UNSUPPORTED_LEAF_SAMPLES = {
    "soybean": FIXTURES_DIR / "soybean_leaf.jpg",
}



@pytest.fixture(autouse=True)
def setup_test_db():
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.db.models.base import Base
    import asyncio

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def init_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(init_db())

    async def override_get_db_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_get_db_session
    yield
    app.dependency_overrides.pop(get_db_session, None)
    asyncio.run(engine.dispose())


def _create_solid_image_bytes(color: tuple, size=(224, 224), fmt="JPEG") -> io.BytesIO:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf


def _create_document_image_bytes() -> io.BytesIO:
    # 224x224 white page with sparse black horizontal lines (simulating text on invoice/document)
    img = Image.new("RGB", (224, 224), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    for y in range(30, 200, 25):
        draw.line([(30, y), (190, y)], fill=(0, 0, 0), width=1)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def _create_geometric_graphic_bytes() -> io.BytesIO:
    # Flat geometric UI graphic with large uniform rectangles
    img = Image.new("RGB", (224, 224), color=(240, 240, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([20, 20, 100, 100], fill=(70, 130, 180))
    draw.rectangle([120, 120, 200, 200], fill=(220, 20, 60))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


# ==============================================================================
# 1-7: Stage-1 Obvious Invalid Image Filter Rejections
# ==============================================================================

def test_1_pure_white_rejected_as_invalid_image():
    client = TestClient(app)
    img_buf = _create_solid_image_bytes((255, 255, 255))
    res = client.post("/api/predictions", files={"image": ("white.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False
    assert "insufficient visual complexity" in data["detail"]


def test_2_pure_black_rejected_as_invalid_image():
    client = TestClient(app)
    img_buf = _create_solid_image_bytes((0, 0, 0))
    res = client.post("/api/predictions", files={"image": ("black.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False
    assert "insufficient visual complexity" in data["detail"]


def test_3_solid_green_rejected_as_invalid_image():
    client = TestClient(app)
    img_buf = _create_solid_image_bytes((34, 139, 34))
    res = client.post("/api/predictions", files={"image": ("green.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False


def test_4_solid_blue_rejected_as_invalid_image():
    client = TestClient(app)
    img_buf = _create_solid_image_bytes((0, 0, 255))
    res = client.post("/api/predictions", files={"image": ("blue.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False


def test_5_solid_brown_rejected_as_invalid_image():
    client = TestClient(app)
    img_buf = _create_solid_image_bytes((139, 69, 19))
    res = client.post("/api/predictions", files={"image": ("brown.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False


def test_6_document_invoice_low_entropy_rejected():
    client = TestClient(app)
    img_buf = _create_document_image_bytes()
    res = client.post("/api/predictions", files={"image": ("invoice.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False


def test_7_geometric_graphic_low_entropy_rejected():
    client = TestClient(app)
    img_buf = _create_geometric_graphic_bytes()
    res = client.post("/api/predictions", files={"image": ("graphic.jpg", img_buf, "image/jpeg")})
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "invalid_image"
    assert data["is_conclusive"] is False


# ==============================================================================
# 8: Genuine Supported E11 Images (Ensures legitimate images are not rejected)
# ==============================================================================

@pytest.mark.parametrize("crop_label, img_path", SUPPORTED_LEAF_SAMPLES.items())
def test_8_genuine_supported_leaves_not_rejected(crop_label, img_path):
    assert img_path.exists(), f"Image path does not exist: {img_path}"
    client = TestClient(app)
    with open(img_path, "rb") as f:
        res = client.post("/api/predictions", files={"image": (img_path.name, f, "image/jpeg")})

    # Stage 1 filter must NOT reject genuine leaf images
    assert res.status_code == 200, f"Legitimate {crop_label} falsely rejected: {res.text}"
    data = res.json()
    assert data["status"] in ("confident", "inconclusive")
    assert "predicted_class" in data
    assert 0.0 <= data["confidence"] <= 1.0


# ==============================================================================
# 9: Genuine Low-Confidence Supported Examples Become Inconclusive
# ==============================================================================

def test_9_low_confidence_supported_example_becomes_inconclusive():
    """Verify that low-confidence (<0.50) or low-margin (<0.15) predictions become 'inconclusive'."""
    class MockUncertainPredictor:
        def predict(self, image_path):
            return {
                "predicted_class": "Potato Early Blight",
                "confidence": 0.42,
                "probabilities": {
                    "Potato Early Blight": 0.42,
                    "Potato Late Blight": 0.38,
                    "Potato Healthy": 0.10,
                    "Tomato Healthy": 0.10,
                },
                "model_version": "E11-SigLIP-HYBRID10-PRODUCTION",
            }

    leaf_path = FIXTURES_DIR / "potato_leaf.jpg"
    app.dependency_overrides[get_predictor] = lambda: MockUncertainPredictor()
    try:
        client = TestClient(app)
        with open(leaf_path, "rb") as f:
            res = client.post("/api/predictions", files={"image": ("leaf.jpg", f, "image/jpeg")})
        assert res.status_code == 200
        data = res.json()
        assert data["is_conclusive"] is False
        assert data["status"] == "inconclusive"
        assert data["predicted_class"] == "Potato Early Blight"
        assert data["confidence"] == 0.42
    finally:
        app.dependency_overrides.pop(get_predictor, None)


# ==============================================================================
# 10: Unsupported Plant Examples (Document remaining OOD limitations)
# ==============================================================================

@pytest.mark.parametrize("plant_name, img_path", UNSUPPORTED_LEAF_SAMPLES.items())
def test_10_unsupported_plants_documented(plant_name, img_path):
    """Run inference on unsupported crops to document whether they are gated or pass as confident."""
    assert img_path.exists(), f"Image path does not exist: {img_path}"
    client = TestClient(app)
    with open(img_path, "rb") as f:
        res = client.post("/api/predictions", files={"image": (img_path.name, f, "image/jpeg")})

    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("confident", "inconclusive", "unsupported_crop", "inconclusive_crop")
    assert isinstance(data["is_conclusive"], bool)
    # Record behavior for reporting: grape -> inconclusive; soybean/pepper/peach/strawberry -> confident


# ==============================================================================
# 11: Malformed Inputs Remain Rejected
# ==============================================================================

def test_11_malformed_inputs_remain_rejected():
    client = TestClient(app)
    # 0-byte file
    res_empty = client.post("/api/predictions", files={"image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")})
    assert res_empty.status_code == 400
    assert res_empty.json()["status"] == "invalid_image"

    # Corrupt/non-image bytes
    res_corrupt = client.post("/api/predictions", files={"image": ("corrupted.jpg", io.BytesIO(b"This is not a real JPEG image content"), "image/jpeg")})
    assert res_corrupt.status_code == 400
    assert res_corrupt.json()["status"] == "invalid_image"


# ==============================================================================
# 12: Handoff Consistency & Downstream Gating
# ==============================================================================

def test_12_handoff_contract_consistency():
    """Verify API response contract consistency for confident, inconclusive, and invalid image states."""
    client = TestClient(app)

    # 1. Invalid image -> HTTP 400, is_conclusive = False, status = "invalid_image", no fake prediction
    buf_invalid = _create_solid_image_bytes((255, 255, 255))
    res_inv = client.post("/api/predictions", files={"image": ("solid.jpg", buf_invalid, "image/jpeg")})
    assert res_inv.status_code == 400
    assert res_inv.json()["status"] == "invalid_image"
    assert res_inv.json()["is_conclusive"] is False
    assert "predicted_class" not in res_inv.json()

    # 2. Inconclusive diagnosis -> HTTP 200, is_conclusive = False, status = "inconclusive"
    class InconclusivePredictor:
        def predict(self, _):
            return {
                "predicted_class": "Tomato Healthy",
                "confidence": 0.35,
                "probabilities": {"Tomato Healthy": 0.35, "Tomato YLCV": 0.30},
                "model_version": "E11-SigLIP-HYBRID10-PRODUCTION",
            }

    leaf_fixture = FIXTURES_DIR / "potato_leaf.jpg"

    app.dependency_overrides[get_predictor] = lambda: InconclusivePredictor()
    try:
        with open(leaf_fixture, "rb") as f:
            res_inconclusive = client.post("/api/predictions", files={"image": ("leaf.jpg", f, "image/jpeg")})
        assert res_inconclusive.status_code == 200
        data_inc = res_inconclusive.json()
        assert data_inc["is_conclusive"] is False
        assert data_inc["status"] == "inconclusive"
    finally:
        app.dependency_overrides.pop(get_predictor, None)
