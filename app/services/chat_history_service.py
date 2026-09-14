import uuid
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.db.models.chat import ChatSession, ChatMessage
from app.core.errors import SessionNotFoundError, SessionAccessError

class ChatHistoryService:
    """Service for persisting and retrieving authenticated user chat history."""
    
    @staticmethod
    async def get_or_create_session(db: AsyncSession, session_id: uuid.UUID, user_id: int) -> ChatSession:
        """
        Retrieve an existing session by UUID, or create it if it doesn't exist.
        Strictly enforces that the session belongs to the provided user_id.
        """
        # 1. Try to find the existing session
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()
        
        if session:
            # Enforce ownership: do not allow cross-tenant access or reassignment
            if session.user_id != user_id:
                raise SessionAccessError()
            return session
            
        # 2. Session does not exist; attempt to create it.
        new_session = ChatSession(id=session_id, user_id=user_id)
        db.add(new_session)
        
        try:
            # We use a nested transaction (savepoint) to safely catch a race condition 
            # (another request creating the exact same session_id concurrently)
            # without invalidating the entire outer database transaction.
            async with db.begin_nested():
                await db.flush()
            return new_session
        except IntegrityError:
            # If we hit an IntegrityError, the session was likely created concurrently.
            # We re-fetch it and verify ownership.
            result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
            session = result.scalar_one_or_none()
            if not session:
                # Fallback if something else caused the IntegrityError
                raise SessionNotFoundError("Failed to create or retrieve chat session.")
            if session.user_id != user_id:
                raise SessionAccessError()
            return session

    @staticmethod
    async def append_message(
        db: AsyncSession, 
        session_id: uuid.UUID, 
        user_id: int, 
        role: str, 
        content: str
    ) -> ChatMessage:
        """
        Append a message to a session, validating ownership.
        """
        # 1. Guarantee session exists and is owned by the user
        session = await ChatHistoryService.get_or_create_session(db, session_id, user_id)
        
        # 2. Create message
        message = ChatMessage(
            session_id=session.id,
            role=role,
            content=content
        )
        db.add(message)
        
        # 3. Explicitly touch the session's updated_at timestamp to reflect recent activity
        session.updated_at = datetime.now(timezone.utc)
        
        await db.flush()
        return message

    @staticmethod
    async def get_session_messages(db: AsyncSession, session_id: uuid.UUID, user_id: int, limit: int | None = None) -> List[ChatMessage]:
        """
        Retrieve all messages for a specific session, strictly enforcing ownership.
        If limit is provided, retrieves the N most recent messages, ordered chronologically.
        """
        # 1. Verify session exists and is owned by the user
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()
        
        if not session:
            raise SessionNotFoundError()
        if session.user_id != user_id:
            raise SessionAccessError()
            
        # 2. Retrieve messages
        if limit is not None:
            query = (
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.id.desc())
                .limit(limit)
            )
            msg_result = await db.execute(query)
            messages = list(msg_result.scalars().all())
            messages.reverse()
            return messages
        else:
            query = (
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.id.asc())
            )
            msg_result = await db.execute(query)
            return list(msg_result.scalars().all())

    @staticmethod
    async def get_user_sessions(db: AsyncSession, user_id: int) -> List[ChatSession]:
        """
        Retrieve all sessions for a specific user, ordered by most recently updated.
        Ties are broken by ID DESC to guarantee deterministic ordering.
        """
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc(), ChatSession.id.desc())
        )
        return list(result.scalars().all())
