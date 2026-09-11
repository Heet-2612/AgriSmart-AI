from app.config import settings
from app.core.database import get_db_session

def get_settings():
    """Dependency yielding app settings."""
    return settings

__all__ = ["get_settings", "get_db_session"]
