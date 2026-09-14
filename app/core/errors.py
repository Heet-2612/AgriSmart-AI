from typing import Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse

class AppError(Exception):
    """Base application domain exception."""
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class InvalidImageError(AppError):
    """Raised when an uploaded image fails validation."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class PayloadTooLargeError(AppError):
    """Raised when an uploaded file exceeds the size threshold."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)


class ModelUnavailableError(AppError):
    """Raised when the AI model inference pipeline or checkpoint is not ready."""
    def __init__(self, message: str):
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


class DatabaseError(AppError):
    """Raised when a database query or persistence operation encounters a failure."""
    def __init__(self, message: str = "Database operation failed."):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InferenceError(AppError):
    """Raised when ML inference execution fails."""
    def __init__(self, message: str = "Model inference failed."):
        super().__init__(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatProviderUnavailableError(AppError):
    """Raised when both primary and fallback GenAI chat providers are unavailable."""
    def __init__(self, message: str = "Assistant temporarily unavailable. Please try again."):
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

class SessionNotFoundError(AppError):
    """Raised when a chat session cannot be found."""
    def __init__(self, message: str = "Chat session not found."):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)

class SessionAccessError(AppError):
    """Raised when a user attempts to access another user's chat session."""
    def __init__(self, message: str = "You do not have permission to access this session."):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    """Standardized handler for domain exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )
