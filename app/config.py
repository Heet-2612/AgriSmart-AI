import os
from pydantic import BaseModel, Field

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
    MODEL_CHECKPOINT_PATH: str = Field(
        default_factory=lambda: os.getenv(
            "MODEL_CHECKPOINT_PATH", "model/checkpoints/best_model.pt"
        )
    )
    MODEL_VERSION: str = Field(
        default_factory=lambda: os.getenv("MODEL_VERSION", "v0.1.0-scaffold")
    )
    OPENWEATHER_API_KEY: str | None = Field(
        default_factory=lambda: os.getenv("OPENWEATHER_API_KEY")
    )
    GEMINI_API_KEY: str | None = Field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY")
    )

settings = Settings()
