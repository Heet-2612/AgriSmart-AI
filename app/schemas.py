from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ValidationInfo
from datetime import datetime
from uuid import UUID

class HealthResponse(BaseModel):
    status: str = "ok"

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    display_name: Optional[str] = None
    precaution: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None

class ErrorResponse(BaseModel):
    detail: str


class DiseaseMetadata(BaseModel):
    display_name: str
    symptoms: str
    treatment: str
    precautions: Optional[str] = None


class WeatherContext(BaseModel):
    risk_level: Optional[str] = None
    rainfall_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    temperature: Optional[float] = None
    humidity: Optional[float] = None


class ChatContext(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    model_version: str
    leaf_detected: bool
    fallback_used: Optional[bool] = False
    disease_metadata: Optional[DiseaseMetadata] = None
    weather_context: Optional[WeatherContext] = None
    location_context: Optional[Dict] = None
    farmer_context: Optional[Dict] = None
    question: str = Field(..., min_length=1, max_length=500)
    session_id: UUID
    language: Optional[str] = Field("en", min_length=2, max_length=5)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("question cannot be empty after trimming")
        return trimmed

    @field_validator("probabilities")
    @classmethod
    def validate_probabilities(cls, v: Dict[str, float]) -> Dict[str, float]:
        for cls_name, prob in v.items():
            if not (0.0 <= prob <= 1.0):
                raise ValueError(f"probability for {cls_name} must be between 0.0 and 1.0")
        return v


class ChatAnswer(BaseModel):
    answer: str
    session_id: UUID
    grounded: bool
    source: str
    timestamp: datetime
