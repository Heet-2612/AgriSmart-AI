import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.exc import IntegrityError
import jwt

from app.main import app
from app.db.models.user import User
from app.core.database import get_db_session
from app.core.security import hash_password, create_access_token
from app.config import settings

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_dependency_overrides():
    """Ensure clean dependency overrides for every test."""
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_register_valid_user():
    payload = {"email": "Test@gmail.com", "password": "SecurePassword123!"}
    
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    async def mock_refresh(instance):
        instance.id = 1
        instance.is_active = True
        instance.created_at = datetime.now(timezone.utc)
    mock_db.refresh.side_effect = mock_refresh
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/register", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    
    # Check email normalization
    assert data["email"] == "test@gmail.com"
    assert "hashed_password" not in data
    assert "password" not in data
    
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


def test_register_duplicate_user():
    payload = {"email": "test@gmail.com", "password": "SecurePassword123!"}
    
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    # Simulate IntegrityError on commit
    mock_db.commit.side_effect = IntegrityError(None, None, Exception())
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/register", json=payload)
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]
    mock_db.rollback.assert_called_once()


def test_register_internal_server_error():
    payload = {"email": "test@gmail.com", "password": "SecurePassword123!"}
    
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit.side_effect = RuntimeError("Database connection lost")
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 500
    assert response.json()["detail"] == "An error occurred during registration."
    mock_db.rollback.assert_called_once()


def test_login_valid_credentials():
    payload = {"email": "Test@example.com", "password": "correctpassword"}
    
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=True
    )
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
    # Verify that the token contains the sub
    decoded = jwt.decode(data["access_token"], settings.JWT_SECRET_KEY, algorithms=["HS256"])
    assert decoded["sub"] == "1"


def test_login_invalid_password():
    payload = {"email": "test@example.com", "password": "wrongpassword"}
    
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=True
    )
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_nonexistent_user():
    payload = {"email": "ghost@example.com", "password": "somepassword"}
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_login_inactive_user():
    payload = {"email": "test@example.com", "password": "correctpassword"}
    
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=False
    )
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/login", json=payload)
    
    assert response.status_code == 401
    assert "Inactive user" in response.json()["detail"]


# --- Tests for GET /api/auth/me ---

def test_get_me_valid_jwt():
    """Valid JWT returns HTTP 200 and authenticated user profile."""
    mock_user = User(
        id=42,
        email="farmer@example.com",
        hashed_password=hash_password("securepassword123"),
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    
    token = create_access_token(subject=str(mock_user.id))
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 42
    assert data["email"] == "farmer@example.com"
    assert data["is_active"] is True
    assert "created_at" in data
    assert "hashed_password" not in data
    assert "password" not in data


def test_get_me_missing_token():
    """Request without token returns HTTP 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_get_me_invalid_token():
    """Request with invalid/malformed JWT returns HTTP 401."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_get_me_nonexistent_user():
    """Valid JWT for nonexistent user ID is rejected with HTTP 401."""
    token = create_access_token(subject="99999")
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"


def test_get_me_inactive_user():
    """Valid JWT for inactive user is rejected with HTTP 401."""
    mock_user = User(
        id=7,
        email="inactive@example.com",
        hashed_password=hash_password("somepassword"),
        is_active=False,
        created_at=datetime.now(timezone.utc)
    )
    token = create_access_token(subject=str(mock_user.id))
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Inactive user"


def test_get_me_password_hash_not_returned():
    """Ensure sensitive fields like hashed_password or password are never exposed in /me response."""
    secret_hash = hash_password("supersecretpass")
    mock_user = User(
        id=10,
        email="secret@example.com",
        hashed_password=secret_hash,
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    token = create_access_token(subject=str(mock_user.id))
    
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "hashed_password" not in data
    assert "password" not in data
    assert secret_hash not in str(data)

def test_register_invalid_email_domain():
    payload = {"email": "test@invalid.com", "password": "SecurePassword123!"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
    assert "Email provider not supported" in str(response.json())

def test_register_invalid_email_no_dot():
    payload = {"email": "test@gmail", "password": "SecurePassword123!"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422

def test_register_short_password():
    payload = {"email": "test@gmail.com", "password": "12345"}
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
    assert "String should have at least 6 characters" in str(response.json())

def test_register_six_char_password():
    payload = {"email": "test@gmail.com", "password": "123456"}
    
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    async def mock_refresh(instance):
        instance.id = 1
        instance.is_active = True
        instance.created_at = datetime.now(timezone.utc)
    mock_db.refresh.side_effect = mock_refresh
    app.dependency_overrides[get_db_session] = lambda: mock_db
    
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
