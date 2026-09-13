import pytest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.core.errors import ChatProviderUnavailableError
from app.dependencies import get_optional_user, get_db_session
from app.schemas import ChatAnswer, ChatContext, ChatHistoryMessage
from app.db.models.user import User
from app.db.models.chat import ChatMessage

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

def test_chat_guest_no_history():
    """Verify a guest request sends empty history to GenAI and no DB lookup."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer) as mock_generate:
        with patch("app.api.routes.chat.ChatHistoryService.get_session_messages", new_callable=AsyncMock) as mock_get_messages:
            response = client.post("/api/chat", json=VALID_PAYLOAD)
            
            assert response.status_code == 200
            mock_generate.assert_called_once()
            context: ChatContext = mock_generate.call_args[0][0]
            assert context.history == []
            mock_get_messages.assert_not_called()

def test_chat_authenticated_new_session_no_history():
    """Verify a new authenticated session sends empty history to GenAI."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    mock_user = User(id=1, email="test@example.com")
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer) as mock_generate:
        with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock):
            with patch("app.api.routes.chat.ChatHistoryService.get_session_messages", return_value=[]) as mock_get_messages:
                with patch("app.api.routes.chat.ChatHistoryService.append_message", new_callable=AsyncMock):
                    
                    mock_db = AsyncMock()
                    app.dependency_overrides[get_optional_user] = lambda: mock_user
                    app.dependency_overrides[get_db_session] = lambda: mock_db
                    
                    response = client.post("/api/chat", json=VALID_PAYLOAD)
                    
                    assert response.status_code == 200
                    mock_generate.assert_called_once()
                    context: ChatContext = mock_generate.call_args[0][0]
                    assert context.history == []
                    mock_get_messages.assert_called_once()
                    
                    app.dependency_overrides.clear()

def test_chat_authenticated_existing_session_with_history():
    """Verify an existing authenticated session retrieves and formats history properly."""
    mock_answer = ChatAnswer(
        answer="You should apply fungicide.",
        session_id=uuid.UUID(VALID_PAYLOAD["session_id"]),
        grounded=True,
        source="gemini",
        timestamp=datetime.now(timezone.utc)
    )
    
    mock_user = User(id=1, email="test@example.com")
    
    # Mock some existing messages in DB
    mock_messages = [
        ChatMessage(role="user", content="Previous question"),
        ChatMessage(role="assistant", content="Previous answer"),
    ]
    
    with patch("app.api.routes.chat.generate_chat_answer", return_value=mock_answer) as mock_generate:
        with patch("app.api.routes.chat.ChatHistoryService.get_or_create_session", new_callable=AsyncMock):
            with patch("app.api.routes.chat.ChatHistoryService.get_session_messages", return_value=mock_messages) as mock_get_messages:
                with patch("app.api.routes.chat.ChatHistoryService.append_message", new_callable=AsyncMock):
                    
                    mock_db = AsyncMock()
                    app.dependency_overrides[get_optional_user] = lambda: mock_user
                    app.dependency_overrides[get_db_session] = lambda: mock_db
                    
                    response = client.post("/api/chat", json=VALID_PAYLOAD)
                    
                    assert response.status_code == 200
                    
                    # Verify GenAI was called with context containing the history
                    mock_generate.assert_called_once()
                    context: ChatContext = mock_generate.call_args[0][0]
                    
                    assert len(context.history) == 2
                    assert context.history[0].role == "user"
                    assert context.history[0].content == "Previous question"
                    assert context.history[1].role == "assistant"
                    assert context.history[1].content == "Previous answer"
                    
                    # Verify the current question was not inserted into history
                    assert context.question == "What should I do about this?"
                    
                    # Verify limit=12 was used for retrieval
                    mock_get_messages.assert_called_once_with(mock_db, uuid.UUID(VALID_PAYLOAD["session_id"]), 1, limit=12)
                    
                    app.dependency_overrides.clear()
