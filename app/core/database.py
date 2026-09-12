from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.config import settings

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine(database_url: Optional[str] = None) -> AsyncEngine:
    """Retrieve or initialize the singleton async SQLAlchemy engine."""
    global _engine, _session_factory
    url = database_url or settings.DATABASE_URL

    if _engine is None:
        engine_kwargs = {
            "echo": settings.DB_ECHO,
            "future": True,
        }

        # PostgreSQL connection pooling parameters
        if "sqlite" not in url:
            engine_kwargs.update({
                "pool_size": settings.DB_POOL_SIZE,
                "max_overflow": settings.DB_MAX_OVERFLOW,
                "pool_pre_ping": True,
            })

        _engine = create_async_engine(url, **engine_kwargs)
        _session_factory = async_sessionmaker(
            bind=_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

    return _engine


def get_session_factory(database_url: Optional[str] = None) -> async_sessionmaker[AsyncSession]:
    """Retrieve or initialize the async session factory."""
    global _session_factory
    if _session_factory is None:
        get_engine(database_url)
    assert _session_factory is not None
    return _session_factory


async def close_db_engine() -> None:
    """Dispose of the database engine connection pool."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency providing an async database session with automatic lifecycle management."""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
