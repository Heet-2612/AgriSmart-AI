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
    VALIDITY_CHECKPOINT_PATH: str = Field(
        default_factory=lambda: os.getenv(
            "VALIDITY_CHECKPOINT_PATH",
            "experiments/e12_siglip_validity/validity_classifier_baseline.pt",
        )
    )
    VALIDITY_MODEL_VERSION: str = Field(
        default_factory=lambda: os.getenv("VALIDITY_MODEL_VERSION", "E12-SigLIP-Validity-Baseline")
    )
    
    # GenAI Settings
    GEMINI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    GROQ_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GROQ_API_KEY"))
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    GROQ_MODEL: str = Field(default_factory=lambda: os.getenv("GROQ_MODEL", "llama3-8b-8192"))

    # Open-Meteo Weather Settings
    OPEN_METEO_GEOCODING_URL: str = Field(
        default_factory=lambda: os.getenv(
            "OPEN_METEO_GEOCODING_URL", "https://geocoding-api.open-meteo.com/v1/search"
        )
    )
    OPEN_METEO_FORECAST_URL: str = Field(
        default_factory=lambda: os.getenv(
            "OPEN_METEO_FORECAST_URL", "https://api.open-meteo.com/v1/forecast"
        )
    )
    WEATHER_REQUEST_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("WEATHER_REQUEST_TIMEOUT_SECONDS", "5.0"))
    )
    OPEN_METEO_TIMEOUT_SECONDS: float = Field(
        default_factory=lambda: float(os.getenv("OPEN_METEO_TIMEOUT_SECONDS", "10.0"))
    )

settings = Settings()
