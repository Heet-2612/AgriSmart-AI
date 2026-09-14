import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.services.chat_history_service import ChatHistoryService
from app.db.models.chat import ChatSession, ChatMessage
from app.core.errors import SessionAccessError, SessionNotFoundError

@pytest.fixture
def mock_db():
    db = AsyncMock()
    
    # db.add is synchronous in SQLAlchemy
    db.add = MagicMock()
    
    # Mock begin_nested async context manager
    nested_mock = MagicMock()
    nested_mock.__aenter__ = AsyncMock(return_value=nested_mock)
    nested_mock.__aexit__ = AsyncMock(return_value=None)
    db.begin_nested = MagicMock(return_value=nested_mock)
    
    return db

@pytest.mark.asyncio
async def test_get_or_create_session_existing_owned(mock_db):
    session_id = uuid.uuid4()
    user_id = 1
    
    existing_session = ChatSession(id=session_id, user_id=user_id)
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_session
    mock_db.execute.return_value = mock_result
    
    session = await ChatHistoryService.get_or_create_session(mock_db, session_id, user_id)
    
    assert session == existing_session
    mock_db.add.assert_not_called()

@pytest.mark.asyncio
async def test_get_or_create_session_existing_unowned(mock_db):
    session_id = uuid.uuid4()
    user_id = 1
    hacker_id = 99
    
    existing_session = ChatSession(id=session_id, user_id=user_id)
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_session
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(SessionAccessError):
        await ChatHistoryService.get_or_create_session(mock_db, session_id, hacker_id)

@pytest.mark.asyncio
async def test_get_or_create_session_new(mock_db):
    session_id = uuid.uuid4()
    user_id = 1
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    session = await ChatHistoryService.get_or_create_session(mock_db, session_id, user_id)
    
    assert session.id == session_id
    assert session.user_id == user_id
    mock_db.add.assert_called_once()
    mock_db.flush.assert_called_once()

@pytest.mark.asyncio
async def test_append_message(mock_db):
    session_id = uuid.uuid4()
    user_id = 1
    
    existing_session = ChatSession(id=session_id, user_id=user_id)
    existing_session.updated_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_session
    mock_db.execute.return_value = mock_result
    
    msg = await ChatHistoryService.append_message(mock_db, session_id, user_id, "user", "Hello")
    
    assert msg.session_id == session_id
    assert msg.role == "user"
    assert msg.content == "Hello"
    assert mock_db.add.call_count == 1
    
    # Assert session updated_at was touched
    assert existing_session.updated_at > datetime(2020, 1, 1, tzinfo=timezone.utc)

@pytest.mark.asyncio
async def test_get_session_messages_unowned(mock_db):
    session_id = uuid.uuid4()
    user_id = 1
    hacker_id = 99
    
    existing_session = ChatSession(id=session_id, user_id=user_id)
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_session
    mock_db.execute.return_value = mock_result
    
    with pytest.raises(SessionAccessError):
        await ChatHistoryService.get_session_messages(mock_db, session_id, hacker_id)
