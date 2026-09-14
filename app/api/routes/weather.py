"""API route for Weather Intelligence and Seasonal Climate."""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas import WeatherResponse, SeasonalClimate, ErrorResponse
from app.services.weather_service import fetch_weather_by_location
from app.services.climate_service import get_seasonal_climate, SeasonalClimateUnavailableError

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

    deterministic farm advisories, and seasonal climate normals for the requested location.
    """
    return await fetch_weather_by_location(location)


@router.get(
    "/seasonal-climate",
    response_model=SeasonalClimate,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid parameter values"},
        404: {"model": ErrorResponse, "description": "Verified seasonal climate data unavailable"},
    },
    summary="Get verified IMD seasonal climate normals",
)
async def get_climate(
    state: str = Query(..., min_length=1, description="Indian state name"),
    district: Optional[str] = Query(None, description="District name"),
    season: Optional[str] = Query(None, description="Agricultural season (Kharif, Rabi, Summer)"),
) -> SeasonalClimate:
    """Retrieve empirical IMD seasonal climate normals (temperature, humidity, rainfall)

    for the specified location and agricultural season.
    """
    try:
        return get_seasonal_climate(state=state, district=district, season=season)
    except SeasonalClimateUnavailableError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

