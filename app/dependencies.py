from app.config import settings
from app.core.database import get_db_session
from app.services.predictor_contract import PredictorProtocol, DefaultPredictor
from app.services.disease_metadata_service import DiseaseMetadataService, get_default_metadata_service


from app.services.leaf_presence_gate import LeafPresenceGate, get_leaf_presence_gate
from app.services.validity_classifier import ValidityClassifier, get_validity_classifier


def get_settings():
    """Dependency yielding app settings."""
    return settings


def get_predictor() -> PredictorProtocol:
    """Dependency yielding the active ML predictor."""
    return DefaultPredictor()


def get_metadata_service() -> DiseaseMetadataService:
    """Dependency yielding the disease metadata mapping service."""
    return get_default_metadata_service()


def get_leaf_gate() -> LeafPresenceGate:
    """Dependency yielding the active E14 leaf presence gate."""
    return get_leaf_presence_gate()


def get_validity_service() -> ValidityClassifier:
    """Dependency yielding the active E12 validity classifier."""
    return get_validity_classifier()


__all__ = [
    "get_settings",
    "get_db_session",
    "get_predictor",
    "get_metadata_service",
    "get_leaf_gate",
    "get_validity_service",
]
