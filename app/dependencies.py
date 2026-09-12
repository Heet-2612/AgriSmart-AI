from app.config import settings
from app.core.database import get_db_session
from app.services.predictor_contract import PredictorProtocol, DefaultPredictor
from app.services.disease_metadata_service import DiseaseMetadataService, get_default_metadata_service


def get_settings():
    """Dependency yielding app settings."""
    return settings


def get_predictor() -> PredictorProtocol:
    """Dependency yielding the active ML predictor."""
    return DefaultPredictor()


def get_metadata_service() -> DiseaseMetadataService:
    """Dependency yielding the disease metadata mapping service."""
    return get_default_metadata_service()


__all__ = ["get_settings", "get_db_session", "get_predictor", "get_metadata_service"]
