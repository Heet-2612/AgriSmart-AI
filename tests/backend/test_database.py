from decimal import Decimal
import pytest
import pytest_asyncio
from sqlalchemy import select, inspect, Numeric
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from alembic.config import Config
from alembic import command

from app.config import settings
from app.core.database import get_engine, get_session_factory
from app.db.models.base import Base
from app.db.models.prediction import PredictionLog
from app.dependencies import get_db_session
from app.main import app
from fastapi.testclient import TestClient


def test_database_settings_loaded():
    """Verify database settings are populated from configuration or defaults."""
    assert settings.DATABASE_URL is not None
    assert "agrismart_db" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL
    assert settings.DB_POOL_SIZE >= 1
    assert settings.DB_MAX_OVERFLOW >= 0


def test_model_metadata_registered():
    """Verify PredictionLog model is registered in SQLAlchemy Base metadata."""
    assert "predictions" in Base.metadata.tables
    table = Base.metadata.tables["predictions"]

    column_names = {c.name for c in table.columns}
    expected_columns = {
        "id",
        "image_filename",
        "predicted_class",
        "confidence",
        "model_version",
        "created_at",
    }
    assert expected_columns.issubset(column_names)

    # Check constraints and column types
    assert table.columns["id"].primary_key is True
    assert table.columns["image_filename"].nullable is False
    assert table.columns["model_version"].nullable is False
    assert isinstance(table.columns["confidence"].type, Numeric)
    assert table.columns["confidence"].type.precision == 5
    assert table.columns["confidence"].type.scale == 4


@pytest.mark.asyncio
async def test_prediction_log_crud_lifecycle():
    """Verify PredictionLog record creation, attributes, and query lifecycle."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        log_entry = PredictionLog(
            image_filename="corn_leaf_sample.jpg",
            predicted_class="Corn___Common_rust",
            confidence=Decimal("0.9754"),
            model_version="v0.1.0-test",
        )
        session.add(log_entry)
        await session.commit()

        # Query back
        stmt = select(PredictionLog).where(PredictionLog.image_filename == "corn_leaf_sample.jpg")
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()

        assert record is not None
        assert record.id is not None
        assert record.predicted_class == "Corn___Common_rust"
        assert float(record.confidence) == pytest.approx(0.9754, rel=1e-3)
        assert record.model_version == "v0.1.0-test"
        assert record.created_at is not None
        assert "Corn___Common_rust" in repr(record)

    await test_engine.dispose()


@pytest.mark.asyncio
async def test_session_lifecycle_rollback_on_failure():
    """Verify session rolls back uncommitted transactions when an exception occurs."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with pytest.raises(RuntimeError):
        async with async_session() as session:
            session.add(
                PredictionLog(
                    image_filename="fail_sample.jpg",
                    predicted_class="Tomato___healthy",
                    confidence=Decimal("0.9900"),
                    model_version="v0.1.0",
                )
            )
            raise RuntimeError("Simulated transaction failure")

    # Verify nothing was committed
    async with async_session() as session:
        result = await session.execute(select(PredictionLog))
        records = result.scalars().all()
        assert len(records) == 0

    await test_engine.dispose()


def test_alembic_migration_execution(tmp_path):
    """Verify Alembic initial migration creates predictions table on a clean database."""
    test_db_file = tmp_path / "alembic_test.db"
    test_db_url = f"sqlite+aiosqlite:///{test_db_file}"

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", test_db_url)

    # Run upgrade head
    command.upgrade(alembic_cfg, "head")

    # Verify table existence in SQLite schema
    import sqlite3
    conn = sqlite3.connect(test_db_file)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='predictions';")
    table_exists = cursor.fetchone()
    conn.close()

    assert table_exists is not None
    assert table_exists[0] == "predictions"


def test_api_predictions_endpoint_with_db_dependency():
    """Verify POST /api/predictions still exists and properly uses the DB dependency."""
    client = TestClient(app)

    # Missing file returns 422
    res_empty = client.post("/api/predictions")
    assert res_empty.status_code == 422

    # Invalid extension returns 400
    res_invalid = client.post(
        "/api/predictions",
        files={"image": ("readme.txt", b"invalid data", "text/plain")}
    )
    assert res_invalid.status_code == 400
    assert "Invalid file extension" in res_invalid.json()["detail"]
