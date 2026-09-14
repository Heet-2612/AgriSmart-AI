from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

from app.schemas import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.core.errors import AppError
from app.db.models.user import User
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.config import settings
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db_session)):
    """Register a new user with an email and password."""
    # Email is normalized by the Pydantic schema EmailStr and the User model @validates hook

    hashed_pwd = hash_password(request.password)
    new_user = User(email=request.email, hashed_password=hashed_pwd)

    try:
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    except AppError as e:
        await db.rollback()
        # Raise AppError directly; it will be handled by the global app_error_handler
        raise e
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration."
        )

    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login for an access token"
)
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db_session)):
    """Authenticate user and return a JWT."""
    auth_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # User model @validates applies to insertion. Here we lowercase explicitly to match lookup
    normalized_email = request.email.strip().lower()

    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()

    if user is None:
        raise auth_exception

    if not verify_password(request.password, user.hashed_password):
        raise auth_exception


    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=access_token)

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user"
)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user details."""
    return current_user
