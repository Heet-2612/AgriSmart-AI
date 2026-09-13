import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field

# Load .env file into os.environ if present in project root
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    with open(_env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key not in os.environ:
                    os.environ[key] = val

class Settings(BaseModel):
    PROJECT_NAME: str = "AgriSmart AI"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/agrismart_db",
        )
    )
    DB_POOL_SIZE: int = Field(default_factory=lambda: int(os.getenv("DB_POOL_SIZE", "5")))
    DB_MAX_OVERFLOW: int = Field(default_factory=lambda: int(os.getenv("DB_MAX_OVERFLOW", "10")))
    DB_ECHO: bool = Field(default_factory=lambda: os.getenv("DB_ECHO", "false").lower() in ("true", "1"))
    MODEL_CHECKPOINT_PATH: str = Field(
        default_factory=lambda: os.getenv(
            "MODEL_CHECKPOINT_PATH", "model/checkpoints/E11_SigLIP_HYBRID10_PRODUCTION.pt"
        )
    )
    MODEL_VERSION: str = Field(
        default_factory=lambda: os.getenv("MODEL_VERSION", "E11-SigLIP-HYBRID10-PRODUCTION")
    )
    
    # GenAI Settings
    GEMINI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    GROQ_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GROQ_API_KEY"))
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    GROQ_MODEL: str = Field(default_factory=lambda: os.getenv("GROQ_MODEL", "llama3-8b-8192"))

    # JWT Settings
    JWT_SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv("JWT_SECRET_KEY", "dev-secret-key-agrismart-ai-sih2026-secure")
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default_factory=lambda: int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")))

    # Email Settings
    SMTP_HOST: Optional[str] = Field(default_factory=lambda: os.getenv("SMTP_HOST"))
    SMTP_PORT: int = Field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    SMTP_USERNAME: Optional[str] = Field(default_factory=lambda: os.getenv("SMTP_USERNAME"))
    SMTP_PASSWORD: Optional[str] = Field(default_factory=lambda: os.getenv("SMTP_PASSWORD"))
    SMTP_FROM_EMAIL: str = Field(default_factory=lambda: os.getenv("SMTP_FROM_EMAIL", "noreply@agrismart.ai"))
    SMTP_FROM_NAME: str = Field(default_factory=lambda: os.getenv("SMTP_FROM_NAME", "AgriSmart AI"))
    EMAIL_VERIFICATION_BASE_URL: str = Field(
        default_factory=lambda: os.getenv("EMAIL_VERIFICATION_BASE_URL", "http://localhost:5173/verify-email")
    )
    EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES: int = Field(
        default_factory=lambda: int(os.getenv("EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES", "1440"))
    )

settings = Settings()
