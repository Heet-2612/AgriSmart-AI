from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = "ok"

class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str

class ErrorResponse(BaseModel):
    detail: str

class CropRecommendationRequest(BaseModel):
    city: str
    soil: str

class RecommendationItem(BaseModel):
    crop: str
    advice: str
    weather_condition: str
    temperature: str

class WeatherInfo(BaseModel):
    temperature: float
    condition: str
    humidity: str | int | float

class CropRecommendationResponse(BaseModel):
    status: str
    city: str
    soil_type: str
    recommendations: list[RecommendationItem] = []
    weather: WeatherInfo | None = None
    message: str | None = None
    suggestions: list[str] | None = None
    error: str | None = None

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str
