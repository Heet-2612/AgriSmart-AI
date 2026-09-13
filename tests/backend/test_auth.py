import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.exc import IntegrityError
import jwt

from app.main import app
from app.db.models.user import User
from app.core.security import hash_password, create_access_token
from app.config import settings

client = TestClient(app)

@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    return session

def test_register_valid_user():
    payload = {"email": "Test@Example.com", "password": "SecurePassword123!"}
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_get_db.return_value = mock_db
        
        # Override the dependency for this test
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        
        # Check email normalization
        assert data["email"] == "test@example.com"
        assert "hashed_password" not in data
        assert "password" not in data
        
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        app.dependency_overrides.clear()


def test_register_duplicate_user():
    payload = {"email": "test@example.com", "password": "SecurePassword123!"}
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        # Simulate IntegrityError on commit
        mock_db.commit.side_effect = IntegrityError(None, None, Exception())
        mock_get_db.return_value = mock_db
        
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
        
        mock_db.rollback.assert_called_once()
        app.dependency_overrides.clear()


def test_login_valid_credentials():
    payload = {"email": "Test@example.com", "password": "correctpassword"}
    
    # Create a mock user
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=True
    )
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        mock_get_db.return_value = mock_db
        
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        
        # Verify that the token contains the sub
        decoded = jwt.decode(data["access_token"], settings.JWT_SECRET_KEY, algorithms=["HS256"])
        assert decoded["sub"] == "1"
        
        app.dependency_overrides.clear()


def test_login_invalid_password():
    payload = {"email": "test@example.com", "password": "wrongpassword"}
    
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=True
    )
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        mock_get_db.return_value = mock_db
        
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
        app.dependency_overrides.clear()


def test_login_nonexistent_user():
    payload = {"email": "ghost@example.com", "password": "somepassword"}
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        mock_get_db.return_value = mock_db
        
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
        app.dependency_overrides.clear()


def test_login_inactive_user():
    payload = {"email": "test@example.com", "password": "correctpassword"}
    
    mock_user = User(
        id=1,
        email="test@example.com",
        hashed_password=hash_password("correctpassword"),
        is_active=False
    )
    
    with patch("app.api.routes.auth.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        mock_get_db.return_value = mock_db
        
        app.dependency_overrides[app.api.routes.auth.get_db_session] = lambda: mock_db
        
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401
        assert "Inactive user" in response.json()["detail"]
        app.dependency_overrides.clear()
