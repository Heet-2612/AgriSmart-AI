import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app
from app.core.errors import SessionAccessError, SessionNotFoundError, DatabaseError
from app.db.models.user import User
from app.dependencies import get_current_user, get_db_session

client = TestClient(app)

def test_get_sessions_guest():
    """Verify guest cannot access sessions endpoint."""
    response = client.get("/api/chat/sessions")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"] or "credentials" in response.json()["detail"].lower()

def test_get_session_messages_guest():
    """Verify guest cannot access messages endpoint."""
    session_id = str(uuid.uuid4())
    response = client.get(f"/api/chat/sessions/{session_id}/messages")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"] or "credentials" in response.json()["detail"].lower()

def test_get_sessions_authenticated():
    """Verify authenticated user can retrieve their sessions."""
    mock_user = User(id=1, email="test@example.com")

    mock_sessions = [
        MagicMock(id=uuid.uuid4(), created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    ]

    with patch("app.api.routes.chat.ChatHistoryService.get_user_sessions", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_sessions

        mock_db = AsyncMock()
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db_session] = lambda: mock_db

        response = client.get("/api/chat/sessions")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "id" in data[0]
        assert "created_at" in data[0]
        assert "updated_at" in data[0]
        assert "user_id" not in data[0]

        mock_get.assert_called_once_with(mock_db, 1)
        mock_db.commit.assert_not_called()

        app.dependency_overrides.clear()

def test_get_session_messages_authenticated():
    """Verify authenticated user can retrieve messages for their session."""
    mock_user = User(id=1, email="test@example.com")
    session_id = uuid.uuid4()

    mock_messages = [
        MagicMock(id=1, role="user", content="Hello", created_at=datetime.now(timezone.utc)),
        MagicMock(id=2, role="assistant", content="Hi", created_at=datetime.now(timezone.utc))
    ]

    with patch("app.api.routes.chat.ChatHistoryService.get_session_messages", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_messages

        mock_db = AsyncMock()
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db_session] = lambda: mock_db

        response = client.get(f"/api/chat/sessions/{session_id}/messages")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["role"] == "user"
        assert data[0]["content"] == "Hello"
        assert "session_id" not in data[0]

        mock_get.assert_called_once_with(mock_db, session_id, 1)
        mock_db.commit.assert_not_called()

        app.dependency_overrides.clear()

def test_get_session_messages_unowned():
    """Verify getting messages for an unowned session raises 403."""
    mock_user = User(id=1, email="test@example.com")
    session_id = uuid.uuid4()

    with patch("app.api.routes.chat.ChatHistoryService.get_session_messages", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = SessionAccessError()

        mock_db = AsyncMock()
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db_session] = lambda: mock_db

        response = client.get(f"/api/chat/sessions/{session_id}/messages")

        assert response.status_code == 403

        app.dependency_overrides.clear()
