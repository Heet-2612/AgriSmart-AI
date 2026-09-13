from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ValidationInfo, EmailStr
from datetime import datetime
from uuid import UUID

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class HealthResponse(BaseModel):
    status: str = "ok"

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    display_name: Optional[str] = None
    precaution: Optional[str] = None
    probabilities: Optional[Dict[str, float]] = None
    pipeline: Optional[str] = None
    leaf_detected: Optional[bool] = None
    roi_count: Optional[int] = None
    fallback_used: Optional[bool] = None

class ErrorResponse(BaseModel):
    detail: str

class CropRecommendationRequest(BaseModel):
    state: str
    district: str
    temperature: float = Field(..., ge=-10.0, le=60.0)
    humidity: float = Field(..., ge=0.0, le=100.0)
    rainfall: float = Field(..., ge=0.0, le=5000.0)
    soil_type: str
    previous_crop: str
    top_k: int = Field(default=3, ge=1, le=10)

class RankedCropRecommendation(BaseModel):
    crop: str
    probability: float
    confidence_tier: str

class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence: float
    confidence_level: str
    recommendations: list[RankedCropRecommendation]
    top_k_recommendations: list[RankedCropRecommendation]
    explanation: str
    model_version: str
    input_features: dict

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


class ChatHistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatContext(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    model_version: str
    leaf_detected: Optional[bool] = None
    fallback_used: Optional[bool] = False
    disease_metadata: Optional[DiseaseMetadata] = None
    weather_context: Optional[WeatherContext] = None
    location_context: Optional[Dict] = None
    farmer_context: Optional[Dict] = None
    question: str = Field(..., min_length=1, max_length=500)
    session_id: UUID
    language: Optional[str] = Field("en")
    history: list[ChatHistoryMessage] = Field(default_factory=list)

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

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("en", "hi", "gu"):
            raise ValueError("unsupported language code")
        return v


class ChatAnswer(BaseModel):
    answer: str
    session_id: UUID
    grounded: bool
    source: str
    timestamp: datetime
class ChatRequest(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    probabilities: Dict[str, float]
    model_version: str
    leaf_detected: Optional[bool] = None
    fallback_used: Optional[bool] = False
    question: str = Field(..., min_length=1, max_length=500)
    session_id: UUID
    language: Optional[str] = Field("en")

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

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("en", "hi", "gu"):
            raise ValueError("unsupported language code")
        return v

class ChatSessionResponse(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    
    model_config = {"from_attributes": True}
