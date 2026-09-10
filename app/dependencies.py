from typing import AsyncGenerator
from app.config import settings

async def get_db_session() -> AsyncGenerator[None, None]:
    """Dependency yielding database session."""
    yield None

def get_settings():
    """Dependency yielding app settings."""
    return settings
