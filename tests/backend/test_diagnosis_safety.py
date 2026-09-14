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
    for env_key in ("AGRISMART_TEST_DATA_DIR", "TEST_IMAGE_ROOT"):
        val = os.getenv(env_key)
        if val and Path(val).exists():
            return Path(val)
    repo_root = Path(__file__).resolve().parents[2]
    if (repo_root / "data").exists():
        return repo_root / "data"
    sibling_data = repo_root.parent / "AgriSmart-AI-main" / "data"
    if sibling_data.exists():
        return sibling_data
    return Path(r"C:\VScode\AgriSmart-AI-main\data")


TEST_IMAGE_ROOT = _resolve_test_image_root()

SUPPORTED_LEAF_SAMPLES = {
    "Potato Early Blight": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Potato___Early_blight" / "04c8e6b9-7710-4cdd-b259-2d78b15d1036___RS_Early.B 7066.JPG",
    "Potato Late Blight": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Potato___Late_blight" / "00695906-210d-4a9d-822e-986a17384115___RS_LB 4026.JPG",
    "Potato Healthy": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Potato___healthy" / "00fc2ee5-729f-4757-8aeb-65c3355874f2___RS_HL 1864.JPG",
    "Tomato YLCV": TEST_IMAGE_ROOT / "plantdoc" / "external_test" / "Tomato___Tomato_Yellow_Leaf_Curl_Virus" / "test_11-40580_5.jpg",
    "Tomato Healthy": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Tomato___healthy" / "04141939-3a8c-47b2-a582-e8371ccc120f___RS_HL 0275.JPG",
    "Corn Healthy": TEST_IMAGE_ROOT / "plantvillage" / "train" / "Corn_(maize)___healthy" / "00031d74-076e-4aef-b040-e068cd3576eb___R.S_HL 8315 copy 2.jpg",
    "Apple Scab": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Apple___Apple_scab" / "0208f4eb-45a4-4399-904e-989ac2c6257c___FREC_Scab 3037.JPG",
    "Apple Healthy": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Apple___healthy" / "0580ddaa-0221-4adc-8b64-8ce1842f5f07___RS_HL 6242.JPG",
}

UNSUPPORTED_LEAF_SAMPLES = {
    "soybean": TEST_IMAGE_ROOT / "plantdoc" / "external_test" / "Soybean___healthy" / "test_07feb_ma_sbr3.JPG.jpg",
    "grape": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Grape___Black_rot" / "017268b1-c25c-4299-a566-1b7ba3f1591e___FAM_B.Rot 3014.JPG",
    "pepper": TEST_IMAGE_ROOT / "plantvillage_benchmark" / "val" / "Pepper,_bell___Bacterial_spot" / "006adb74-934f-448f-a14f-62181742127b___JR_B.Spot 3395.JPG",
    "peach": TEST_IMAGE_ROOT / "plantdoc" / "external_test" / "Peach___healthy" / "test_00pe.jpg",
    "strawberry": TEST_IMAGE_ROOT / "plantdoc" / "external_test" / "Strawberry___healthy" / "test_strawberry-leaf--stock-photo-1431216.jpg",
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

    # Synthetic textured leaf image passing Stage 1
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    for i in range(224):
        for j in range(224):
            arr[i, j, 0] = int(35 + 20 * np.sin(i / 10.0))
            arr[i, j, 1] = int(120 + 40 * np.sin((i + j) / 15.0))
            arr[i, j, 2] = int(30 + 15 * np.cos(j / 10.0))
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    app.dependency_overrides[get_predictor] = lambda: MockUncertainPredictor()
    try:
        client = TestClient(app)
        res = client.post("/api/predictions", files={"image": ("leaf.jpg", buf, "image/jpeg")})
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

    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    for i in range(224):
        for j in range(224):
            arr[i, j, 0] = int(40 + 20 * np.sin(i / 10.0))
            arr[i, j, 1] = int(120 + 30 * np.sin(j / 10.0))
            arr[i, j, 2] = int(35 + 10 * np.cos((i + j) / 10.0))
    buf_leaf = io.BytesIO()
    Image.fromarray(arr).save(buf_leaf, format="JPEG")
    buf_leaf.seek(0)

    app.dependency_overrides[get_predictor] = lambda: InconclusivePredictor()
    try:
        res_inconclusive = client.post("/api/predictions", files={"image": ("leaf.jpg", buf_leaf, "image/jpeg")})
        assert res_inconclusive.status_code == 200
        data_inc = res_inconclusive.json()
        assert data_inc["is_conclusive"] is False
        assert data_inc["status"] == "inconclusive"
    finally:
        app.dependency_overrides.pop(get_predictor, None)
