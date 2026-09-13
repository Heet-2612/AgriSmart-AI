"""API route for Weather Intelligence."""

from fastapi import APIRouter, Query, status
from app.schemas import WeatherResponse, ErrorResponse
from app.services.weather_service import fetch_weather_by_location

router = APIRouter(prefix="/api", tags=["Weather"])


@router.get(
    "/weather",
    response_model=WeatherResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or empty location parameter"},
        404: {"model": ErrorResponse, "description": "Location coordinates not found"},
        502: {"model": ErrorResponse, "description": "Weather provider returned an error"},
        503: {"model": ErrorResponse, "description": "Weather provider unreachable or timed out"},
    },
    summary="Get weather and agricultural advisories",
)
async def get_weather(
    location: str = Query(
        ...,
        min_length=1,
        description="City or district name (e.g. Pune, Nashik, Ahmedabad, Anand)",
    ),
) -> WeatherResponse:
    """Retrieve normalized real-time atmospheric conditions, daily precipitation forecast,

    and deterministic farm advisories for the requested location.
    """
    return await fetch_weather_by_location(location)
