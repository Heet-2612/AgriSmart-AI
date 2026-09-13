import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app
from app.schemas import ChatAnswer, ChatContext
from app.core.errors import ChatProviderUnavailableError, SessionAccessError, DatabaseError
from app.db.models.user import User

client = TestClient(app)

VALID_PAYLOAD = {
    "predicted_class": "Potato Early Blight",
    "confidence": 0.95,
    "probabilities": {"Potato Early Blight": 0.95, "Potato Healthy": 0.05},
    "model_version": "v1.0.0",
    "leaf_detected": True,
    "fallback_used": False,
    "question": "What should I do about this?",
    "session_id": str(uuid.uuid4()),
    "language": "en"
}

def test_chat_guest_valid_request():
    """Verify a guest request skips persistence and returns ChatAnswer."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer) as mock_generate:
        with patch("app.api.routes.chat.ChatHistoryService.append_message") as mock_append:
            response = client.post("/api/chat", json=VALID_PAYLOAD)
            
            assert response.status_code == 200
            mock_generate.assert_called_once()
            mock_append.assert_not_called()

def test_chat_authenticated_success():
    """Verify an authenticated request persists messages successfully."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    mock_user = User(id=1, email="test@example.com")
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer) as mock_generate:
        with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock) as mock_get_or_create:
            with patch("app.api.routes.chat.ChatHistoryService.append_message", new_callable=AsyncMock) as mock_append:
                
                # Setup dependency override for current_user and db
                mock_db = AsyncMock()
                app.dependency_overrides[app.api.routes.chat.get_optional_user] = lambda: mock_user
                app.dependency_overrides[app.api.routes.chat.get_db_session] = lambda: mock_db
                
                response = client.post("/api/chat", json=VALID_PAYLOAD)
                
                assert response.status_code == 200
                assert response.json()["answer"] == "You should apply fungicide."
                
                # Verify get_or_create_session was called to check ownership early
                mock_get_or_create.assert_called_once_with(mock_db, uuid.UUID(VALID_PAYLOAD["session_id"]), 1)
                
                # Verify both user and assistant messages were appended
                assert mock_append.call_count == 2
                
                # Verify commit was called
                mock_db.commit.assert_called_once()
                mock_db.rollback.assert_not_called()
                
                app.dependency_overrides.clear()

def test_chat_authenticated_cross_user_rejection():
    """Verify that if the session belongs to another user, we get 403."""
    mock_user = User(id=1, email="test@example.com")
    
    with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock) as mock_get_or_create:
        mock_get_or_create.side_effect = SessionAccessError()
        
        mock_db = AsyncMock()
        app.dependency_overrides[app.api.routes.chat.get_optional_user] = lambda: mock_user
        app.dependency_overrides[app.api.routes.chat.get_db_session] = lambda: mock_db
        
        response = client.post("/api/chat", json=VALID_PAYLOAD)
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()

def test_chat_authenticated_genai_failure():
    """Verify that if GenAI fails, we do NOT persist anything and no commit occurs."""
    mock_user = User(id=1, email="test@example.com")
    
    with patch("app.api.routes.chat.generate_chat_answer", side_effect=ChatProviderUnavailableError()):
        with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock):
            with patch("app.api.routes.chat.ChatHistoryService.append_message", new_callable=AsyncMock) as mock_append:
                
                mock_db = AsyncMock()
                app.dependency_overrides[app.api.routes.chat.get_optional_user] = lambda: mock_user
                app.dependency_overrides[app.api.routes.chat.get_db_session] = lambda: mock_db
                
                response = client.post("/api/chat", json=VALID_PAYLOAD)
                
                assert response.status_code == 503
                mock_append.assert_not_called()
                mock_db.commit.assert_not_called()
                
                app.dependency_overrides.clear()

def test_chat_authenticated_persistence_failure():
    """Verify that if persistence fails after GenAI, we rollback."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    mock_user = User(id=1, email="test@example.com")
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer):
        with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock):
            with patch("app.api.routes.chat.ChatHistoryService.append_message", new_callable=AsyncMock) as mock_append:
                
                # Simulate database crashing on the second insert
                mock_append.side_effect = [None, Exception("DB crashed")]
                
                mock_db = AsyncMock()
                app.dependency_overrides[app.api.routes.chat.get_optional_user] = lambda: mock_user
                app.dependency_overrides[app.api.routes.chat.get_db_session] = lambda: mock_db
                
                response = client.post("/api/chat", json=VALID_PAYLOAD)
                
                assert response.status_code == 500
                mock_db.commit.assert_not_called()
                mock_db.rollback.assert_called_once()
                
                app.dependency_overrides.clear()
