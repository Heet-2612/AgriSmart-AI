import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
import jwt

from app.main import app
from app.db.models.user import User
from app.config import settings

client = TestClient(app)

def test_get_me_valid_token():
    mock_user = User(
        id=1,
        email="test@example.com",
        is_active=True,
        created_at=datetime.now(timezone.utc)
    )
    
    # Generate a valid token
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = jwt.encode({"exp": expire, "sub": "1"}, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    with patch("app.dependencies.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        
        # We need to mock the dependency resolution in the app
        app.dependency_overrides[app.dependencies.get_db_session] = lambda: mock_db
        
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["id"] == 1
        assert "hashed_password" not in data
        
        app.dependency_overrides.clear()

def test_get_me_missing_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

def test_get_me_malformed_token():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_get_me_expired_token():
    # Generate an expired token
    expire = datetime.now(timezone.utc) - timedelta(minutes=15)
    token = jwt.encode({"exp": expire, "sub": "1"}, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Token has expired"

def test_get_me_invalid_signature():
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    # Sign with a different secret
    token = jwt.encode({"exp": expire, "sub": "1"}, "wrong_secret", algorithm="HS256")
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]

def test_get_me_inactive_user():
    mock_user = User(
        id=1,
        email="test@example.com",
        is_active=False
    )
    
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = jwt.encode({"exp": expire, "sub": "1"}, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    with patch("app.dependencies.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result
        
        app.dependency_overrides[app.dependencies.get_db_session] = lambda: mock_db
        
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 401
        assert "Inactive user" in response.json()["detail"]
        
        app.dependency_overrides.clear()

def test_get_me_nonexistent_user():
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = jwt.encode({"exp": expire, "sub": "999"}, settings.JWT_SECRET_KEY, algorithm="HS256")
    
    with patch("app.dependencies.get_db_session") as mock_get_db:
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        app.dependency_overrides[app.dependencies.get_db_session] = lambda: mock_db
        
        response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]
        
        app.dependency_overrides.clear()
