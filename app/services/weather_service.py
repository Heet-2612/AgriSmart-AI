"""Live Weather Service integrating Open-Meteo API for AgriSmart AI."""

import httpx
from fastapi import HTTPException, status
from app.config import settings
from app.schemas import (
    WeatherLocation,
    WeatherCurrent,
    WeatherDaily,
    WeatherResponse,
)

WMO_WEATHER_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def get_weather_condition(weather_code: int) -> str:
    """Map WMO weather code to human-readable condition string."""
    return WMO_WEATHER_CODES.get(weather_code, "Unknown conditions")


def generate_farm_advisories(
    precipitation_sum: float,
    precipitation_probability: int,
    max_temp: float,
    humidity: int,
    wind_speed: float,
) -> list[str]:
    """Generate deterministic rule-based agricultural advisory messages.

    Rules:
    1. Expected rainfall >= 5 mm: 'Rain is expected today. Postpone irrigation where possible.'
    2. Rain probability >= 60%: 'High chance of rain. Avoid applying fertilizer or pesticide immediately before rainfall.'
    3. Temperature >= 35°C: 'High heat expected. Irrigate early morning or evening to reduce water loss.'
    4. Humidity >= 80%: 'High humidity may increase fungal disease risk. Inspect crops and avoid prolonged leaf wetness.'
    5. Wind speed >= 25 km/h: 'Strong wind expected. Avoid spraying pesticides or nutrients.'
    6. Default if none apply: 'Weather conditions are generally suitable for routine farm activities.'
    """
    advisories: list[str] = []

    if precipitation_sum >= 5.0:
        advisories.append("Rain is expected today. Postpone irrigation where possible.")

    if precipitation_probability >= 60:
        advisories.append(
            "High chance of rain. Avoid applying fertilizer or pesticide immediately before rainfall."
        )

    if max_temp >= 35.0:
        advisories.append(
            "High heat expected. Irrigate early morning or evening to reduce water loss."
        )

    if humidity >= 80:
        advisories.append(
            "High humidity may increase fungal disease risk. Inspect crops and avoid prolonged leaf wetness."
        )

    if wind_speed >= 25.0:
        advisories.append("Strong wind expected. Avoid spraying pesticides or nutrients.")

    if not advisories:
        advisories.append(
            "Weather conditions are generally suitable for routine farm activities."
        )

    return advisories[:3]


async def fetch_weather_by_location(location: str) -> WeatherResponse:
    """Fetch live meteorological data from Open-Meteo for a city/district."""
    cleaned_location = location.strip()
    if not cleaned_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location query must be a non-empty string.",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Geocode location name
        try:
            geo_response = await client.get(
                settings.OPEN_METEO_GEOCODING_URL,
                params={
                    "name": cleaned_location,
                    "count": 1,
                    "language": "en",
                    "format": "json",
                },
            )
            geo_response.raise_for_status()
            geo_data = geo_response.json()
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Geocoding service timed out. Please try again.",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to reach geocoding provider: {str(exc)}",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Geocoding provider returned error: {exc.response.status_code}",
            )

        results = geo_data.get("results")
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location '{cleaned_location}' not found. Please verify the city name.",
            )

        first_match = results[0]
        loc_name = first_match.get("name", cleaned_location)
        country = first_match.get("country", "Unknown")
        latitude = float(first_match.get("latitude", 0.0))
        longitude = float(first_match.get("longitude", 0.0))

        # Step 2: Fetch current and daily forecast metrics
        try:
            forecast_response = await client.get(
                settings.OPEN_METEO_FORECAST_URL,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
                    "timezone": "auto",
                },
            )
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Weather forecast service timed out. Please try again.",
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to reach weather forecast provider: {str(exc)}",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Weather forecast provider returned error: {exc.response.status_code}",
            )

    current = forecast_data.get("current", {})
    daily = forecast_data.get("daily", {})

    temp_curr = float(current.get("temperature_2m", 0.0))
    humidity = int(round(current.get("relative_humidity_2m", 0)))
    wind_speed = float(current.get("wind_speed_10m", 0.0))
    weather_code = int(current.get("weather_code", 0))
    condition = get_weather_condition(weather_code)

    temp_min_list = daily.get("temperature_2m_min", [temp_curr])
    temp_min = float(temp_min_list[0]) if temp_min_list and temp_min_list[0] is not None else temp_curr

    temp_max_list = daily.get("temperature_2m_max", [temp_curr])
    temp_max = float(temp_max_list[0]) if temp_max_list and temp_max_list[0] is not None else temp_curr

    precip_sum_list = daily.get("precipitation_sum", [0.0])
    precipitation_sum = float(precip_sum_list[0]) if precip_sum_list and precip_sum_list[0] is not None else 0.0

    precip_prob_list = daily.get("precipitation_probability_max", [0])
    precipitation_probability = (
        int(round(precip_prob_list[0]))
        if precip_prob_list and precip_prob_list[0] is not None
        else 0
    )

    advisories = generate_farm_advisories(
        precipitation_sum=precipitation_sum,
        precipitation_probability=precipitation_probability,
        max_temp=temp_max,
        humidity=humidity,
        wind_speed=wind_speed,
    )

    return WeatherResponse(
        location=WeatherLocation(
            name=loc_name,
            country=country,
            latitude=latitude,
            longitude=longitude,
        ),
        current=WeatherCurrent(
            temperature=temp_curr,
            humidity=humidity,
            wind_speed=wind_speed,
            weather_code=weather_code,
            condition=condition,
        ),
        daily=WeatherDaily(
            temp_min=temp_min,
            temp_max=temp_max,
            precipitation_sum=precipitation_sum,
            precipitation_probability=precipitation_probability,
        ),
        advisories=advisories,
    )
