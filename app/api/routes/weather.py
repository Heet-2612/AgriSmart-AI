from fastapi import APIRouter, Query, status
from app.schemas import WeatherResponse, ErrorResponse
from app.services.weather_service import fetch_weather_by_location

router = APIRouter(prefix="/api", tags=["Weather"])

@router.get(
    "/weather",
    response_model=WeatherResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid location query"},
        404: {"model": ErrorResponse, "description": "Location not found"},
        503: {"model": ErrorResponse, "description": "Weather service unavailable"},
    },
    summary="Get weather and agricultural advisories",
)
async def get_weather(
    location: str = Query(..., min_length=1, description="City or district name (e.g. Pune, Nashik)"),
):
    """Retrieve real-time weather metrics and rule-based farm advisories for a given location."""
    return await fetch_weather_by_location(location)
