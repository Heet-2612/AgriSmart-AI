from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.core.database import get_db_session
from app.services.predictor_contract import PredictorProtocol, DefaultPredictor
from app.services.disease_metadata_service import DiseaseMetadataService, get_default_metadata_service
from app.db.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_settings():
    """Dependency yielding app settings."""
    return settings


def get_predictor() -> PredictorProtocol:
    """Dependency yielding the active ML predictor."""
    return DefaultPredictor()


def get_metadata_service() -> DiseaseMetadataService:
    """Dependency yielding the disease metadata mapping service."""
    return get_default_metadata_service()

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db_session)) -> User:
    """Dependency yielding the currently authenticated user based on Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

async def get_optional_user(token: str = Depends(oauth2_scheme_optional), db: AsyncSession = Depends(get_db_session)) -> User | None:
    """Dependency yielding the authenticated user if token is present, else None. Rejects invalid tokens."""
    if not token:
        return None
    return await get_current_user(token=token, db=db)


__all__ = ["get_settings", "get_db_session", "get_predictor", "get_metadata_service", "get_current_user", "get_optional_user"]
