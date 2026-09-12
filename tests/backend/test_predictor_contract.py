import io
import os
from decimal import Decimal
from pathlib import Path
from typing import Dict, Any, Union, Optional
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.main import app
from app.db.models.base import Base
from app.db.models.prediction import PredictionLog
from app.dependencies import get_db_session, get_predictor, get_metadata_service
from app.core.errors import (
    InvalidImageError,
    ModelUnavailableError,
    InferenceError,
)
from app.services.predictor_contract import PredictionOutput, PredictorProtocol
from app.services.disease_metadata_service import DiseaseMetadataService


class MockPredictorDouble:
    """Explicit test double for ML Predictor.

    Guarantees no production ML or weights are invoked during backend testing.
    Records received filesystem paths and tracks if file existed at prediction time.
    """

    def __init__(
        self,
        canned_output: Optional[Union[PredictionOutput, Dict[str, Any]]] = None,
        exception_to_raise: Optional[Exception] = None,
    ):
        self.canned_output = canned_output
        self.exception_to_raise = exception_to_raise
        self.received_paths: list[str] = []
        self.file_existed_during_call: list[bool] = []

    def predict(self, image_path: Union[str, Path]) -> Union[PredictionOutput, Dict[str, Any]]:
        path_str = str(image_path)
        self.received_paths.append(path_str)
        self.file_existed_during_call.append(os.path.exists(path_str))

        if self.exception_to_raise is not None:
            raise self.exception_to_raise

        if self.canned_output is not None:
            return self.canned_output

        return PredictionOutput(
            predicted_class="Tomato___Early_blight",
            confidence=0.9845,
            probabilities={"Tomato___Early_blight": 0.9845, "Tomato___healthy": 0.0155},
            model_version="E5_YOLOv8n_E4",
        )


@pytest.fixture
def test_db_session():
    """Create an isolated in-memory SQLite async database session for tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def init_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    import asyncio
    asyncio.run(init_db())

    async def override_get_db_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    return override_get_db_session, session_factory, engine


def test_successful_prediction_flow(test_db_session):
    """Verify end-to-end contract flow with test double:

    - Receives filesystem path
    - Normalizes predictor output
    - Resolves backend-owned metadata
    - Returns exact API schema
    - Cleans up temporary image file
    - Persists prediction to database
    """
    override_db, session_factory, engine = test_db_session

    test_predictor = MockPredictorDouble(
        canned_output=PredictionOutput(
            predicted_class="Tomato___Early_blight",
            confidence=0.9823,
            probabilities={"Tomato___Early_blight": 0.9823, "Tomato___healthy": 0.0177},
            model_version="E5_YOLOv8n_E4",
            pipeline="leaf_detection_multi_roi",
            leaf_detected=True,
            roi_count=3,
            fallback_used=False,
        )
    )

    test_metadata_service = DiseaseMetadataService()
    test_metadata_service.register(
        predicted_class="Tomato___Early_blight",
        display_name="Tomato Early Blight",
        precaution="Remove infected lower leaves and apply copper-based fungicide.",
    )

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor
    app.dependency_overrides[get_metadata_service] = lambda: test_metadata_service

    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("tomato_leaf.jpg", sample_jpeg, "image/jpeg")},
        )

        assert response.status_code == 200
        data = response.json()

        # Schema assertions
        assert data["predicted_class"] == "Tomato___Early_blight"
        assert data["confidence"] == pytest.approx(0.9823, abs=1e-4)
        assert data["model_version"] == "E5_YOLOv8n_E4"
        assert data["display_name"] == "Tomato Early Blight"
        assert data["precaution"] == "Remove infected lower leaves and apply copper-based fungicide."
        assert data["probabilities"] == {"Tomato___Early_blight": 0.9823, "Tomato___healthy": 0.0177}
        assert data["pipeline"] == "leaf_detection_multi_roi"
        assert data["leaf_detected"] is True
        assert data["roi_count"] == 3
        assert data["fallback_used"] is False

        # Predictor invocation checks
        assert len(test_predictor.received_paths) == 1
        passed_path = test_predictor.received_paths[0]
        assert test_predictor.file_existed_during_call[0] is True

        # Ensure temp file was cleaned up after request
        assert not os.path.exists(passed_path), "Temporary image was not cleaned up after success"

        # Verify DB persistence
        async def verify_db():
            async with session_factory() as session:
                stmt = select(PredictionLog)
                result = await session.execute(stmt)
                records = result.scalars().all()
                assert len(records) == 1
                record = records[0]
                assert record.image_filename == "tomato_leaf.jpg"
                assert record.predicted_class == "Tomato___Early_blight"
                assert float(record.confidence) == pytest.approx(0.9823, abs=1e-4)
                assert record.model_version == "E5_YOLOv8n_E4"
                assert record.created_at is not None

        import asyncio
        asyncio.run(verify_db())

    finally:
        app.dependency_overrides.clear()
        import asyncio
        asyncio.run(engine.dispose())


def test_dict_output_normalization(test_db_session):
    """Verify that predictor returning a raw dict is normalized according to the contract."""
    override_db, session_factory, engine = test_db_session
    test_predictor = MockPredictorDouble(
        canned_output={
            "predicted_class": "Corn___Common_rust",
            "confidence": 0.9412,
            "probabilities": {"Corn___Common_rust": 0.9412, "Corn___healthy": 0.0588},
            "model_version": "E5_YOLOv8n_E4",
        }
    )

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor
    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("corn.jpg", sample_jpeg, "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["predicted_class"] == "Corn___Common_rust"
        assert data["confidence"] == pytest.approx(0.9412, abs=1e-4)
        assert data["model_version"] == "E5_YOLOv8n_E4"
        # Verify fallback display_name formatted cleanly from canonical class
        assert data["display_name"] == "Corn — Common Rust"
        assert data["precaution"] is None
        
        # Verify diagnostic fields default to None when absent
        assert data.get("pipeline") is None
        assert data.get("leaf_detected") is None
        assert data.get("roi_count") is None
        assert data.get("fallback_used") is None
    finally:
        app.dependency_overrides.clear()
        import asyncio
        asyncio.run(engine.dispose())


def test_fallback_metadata_mapping_when_unregistered():
    """Verify backend produces clean non-fabricated presentation when class is not in metadata registry."""
    metadata_service = DiseaseMetadataService()
    meta = metadata_service.get_metadata("Apple___Cedar_apple_rust")
    assert meta.display_name == "Apple — Cedar Apple Rust"
    assert meta.precaution is None


def test_model_unavailable_returns_503(test_db_session):
    """Verify model unavailable error returns HTTP 503, cleans temp file, and does not persist to DB."""
    override_db, session_factory, engine = test_db_session
    test_predictor = MockPredictorDouble(
        exception_to_raise=ModelUnavailableError("Model weights 'E5_YOLOv8n_E4' not found.")
    )

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor

    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("leaf.jpg", sample_jpeg, "image/jpeg")},
        )
        assert response.status_code == 503
        assert "Model weights" in response.json()["detail"]

        # Ensure temp file cleaned up despite exception
        assert len(test_predictor.received_paths) == 1
        passed_path = test_predictor.received_paths[0]
        assert not os.path.exists(passed_path), "Temp file was not cleaned up on 503"

        # Ensure no record persisted
        async def verify_db_empty():
            async with session_factory() as session:
                records = (await session.execute(select(PredictionLog))).scalars().all()
                assert len(records) == 0

        import asyncio
        asyncio.run(verify_db_empty())
    finally:
        app.dependency_overrides.clear()
        import asyncio
        asyncio.run(engine.dispose())


def test_inference_failure_returns_500(test_db_session):
    """Verify ML inference execution failure maps to HTTP 500, cleans temp file, and does not persist."""
    override_db, session_factory, engine = test_db_session
    test_predictor = MockPredictorDouble(
        exception_to_raise=RuntimeError("CUDA execution error during forward pass")
    )

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor

    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("leaf.jpg", sample_jpeg, "image/jpeg")},
        )
        assert response.status_code == 500
        assert "inference failed" in response.json()["detail"].lower()

        # Temp file cleaned up
        passed_path = test_predictor.received_paths[0]
        assert not os.path.exists(passed_path), "Temp file was not cleaned up on 500"

        # Nothing persisted
        async def verify_empty():
            async with session_factory() as session:
                records = (await session.execute(select(PredictionLog))).scalars().all()
                assert len(records) == 0

        import asyncio
        asyncio.run(verify_empty())
    finally:
        app.dependency_overrides.clear()
        import asyncio
        asyncio.run(engine.dispose())


def test_invalid_image_from_predictor_returns_400(test_db_session):
    """Verify predictor raising InvalidImageError returns HTTP 400 and cleans up temp file."""
    override_db, session_factory, engine = test_db_session
    test_predictor = MockPredictorDouble(
        exception_to_raise=InvalidImageError("Uploaded file cannot be parsed as a valid image tensor.")
    )

    app.dependency_overrides[get_db_session] = override_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor

    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("corrupted.jpg", sample_jpeg, "image/jpeg")},
        )
        assert response.status_code == 400
        assert "cannot be parsed" in response.json()["detail"]

        passed_path = test_predictor.received_paths[0]
        assert not os.path.exists(passed_path), "Temp file was not cleaned up on 400"

        async def verify_empty():
            async with session_factory() as session:
                records = (await session.execute(select(PredictionLog))).scalars().all()
                assert len(records) == 0

        import asyncio
        asyncio.run(verify_empty())
    finally:
        app.dependency_overrides.clear()
        import asyncio
        asyncio.run(engine.dispose())


def test_database_persistence_failure_returns_controlled_500():
    """Verify database persistence failure returns controlled HTTP 500 and cleans temp file."""
    class FailingDbSession:
        def add(self, _):
            pass

        async def flush(self):
            raise RuntimeError("Database connection lost during flush")

    async def override_failing_db():
        yield FailingDbSession()

    test_predictor = MockPredictorDouble()

    app.dependency_overrides[get_db_session] = override_failing_db
    app.dependency_overrides[get_predictor] = lambda: test_predictor

    client = TestClient(app)
    sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

    try:
        response = client.post(
            "/api/predictions",
            files={"image": ("leaf.jpg", sample_jpeg, "image/jpeg")},
        )
        assert response.status_code == 500
        assert "database persistence failed" in response.json()["detail"].lower()

        # Temp file must still be cleaned up
        passed_path = test_predictor.received_paths[0]
        assert not os.path.exists(passed_path), "Temp file was not cleaned up on DB failure"
    finally:
        app.dependency_overrides.clear()


def test_contract_guarantees_no_fake_predictions_on_any_error():
    """Verify that error scenarios never fall back to fake/fabricated prediction results."""
    error_cases = [
        ModelUnavailableError("Weights missing"),
        InferenceError("Model inference engine crashed"),
        InvalidImageError("Bad tensor shape"),
        RuntimeError("Unknown hardware fault"),
    ]

    for err in error_cases:
        test_predictor = MockPredictorDouble(exception_to_raise=err)
        app.dependency_overrides[get_predictor] = lambda: test_predictor
        client = TestClient(app)
        sample_jpeg = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9")

        try:
            response = client.post(
                "/api/predictions",
                files={"image": ("leaf.jpg", sample_jpeg, "image/jpeg")},
            )
            # Must not be 200 and must not return fabricated prediction response
            assert response.status_code in {400, 500, 503}
            body = response.json()
            assert "predicted_class" not in body
            assert "confidence" not in body
            assert "detail" in body
        finally:
            app.dependency_overrides.clear()
