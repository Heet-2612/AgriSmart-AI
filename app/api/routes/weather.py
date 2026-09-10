from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.weather_service import get_weather

router = APIRouter()

@router.get("/{city}")
async def get_city_weather(city: str) -> Dict[str, Any]:
    """Get weather data for a specific city."""
    weather_data = await get_weather(city)
    if not weather_data:
        raise HTTPException(status_code=400, detail=f"Could not fetch weather for {city}")
    return weather_data
