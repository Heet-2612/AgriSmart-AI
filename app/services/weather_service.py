import httpx
from typing import Optional, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def get_weather(city: str) -> Optional[Dict[str, Any]]:
    """Fetches weather data from OpenWeatherMap API."""
    if not settings.OPENWEATHER_API_KEY:
        logger.warning("OpenWeather API key is missing")
        return None
        
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city},IN&appid={settings.OPENWEATHER_API_KEY}&units=metric"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Weather API error: {response.status_code} - {response.text}")
                return None
    except httpx.RequestError as e:
        logger.error(f"Error fetching weather data: {str(e)}")
        return None
