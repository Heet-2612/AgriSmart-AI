import json
import logging
from fastapi import APIRouter, HTTPException
from app.schemas import CropRecommendationRequest, CropRecommendationResponse, RecommendationItem, WeatherInfo
from app.services.weather_service import get_weather
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

CROP_RULES_PATH = Path("app/data/crop_rules.json")

@router.post("/", response_model=CropRecommendationResponse)
async def recommend_crop(request: CropRecommendationRequest):
    """Recommends a crop based on city weather and soil type."""
    city = request.city
    soil = request.soil
    
    logger.info(f"Fetching weather for {city}...")
    weather_data = await get_weather(city)
    
    if not weather_data:
        raise HTTPException(
            status_code=400,
            detail=f"Could not fetch weather for {city}. Please check the city name and try again."
        )

    current_temp = weather_data.get('main', {}).get('temp', 0)
    weather_condition = weather_data.get('weather', [{}])[0].get('main', 'Unknown')
    humidity = weather_data.get('main', {}).get('humidity', 'N/A')
    
    weather_info = WeatherInfo(
        temperature=current_temp,
        condition=weather_condition,
        humidity=humidity
    )

    try:
        if CROP_RULES_PATH.exists():
            with open(CROP_RULES_PATH, 'r', encoding='utf-8') as f:
                rules = json.load(f)
        else:
            logger.warning("crop_rules.json not found. Using default rules.")
            rules = [
                {
                    "crop": "Wheat",
                    "advice": "Ideal for current conditions. Requires moderate watering.",
                    "conditions": {
                        "weather_main": "Clear",
                        "temp_min_celsius": 10,
                        "soil": "loamy"
                    }
                },
                {
                    "crop": "Rice",
                    "advice": "Suitable for wet conditions. Ensure proper water management.",
                    "conditions": {
                        "weather_main": "Rain",
                        "temp_min_celsius": 20,
                        "soil": "clay"
                    }
                }
            ]
            
        matching_crops = []
        for rule in rules:
            conditions = rule.get('conditions', {})
            if (weather_condition.lower() == conditions.get('weather_main', '').lower() and
                current_temp >= conditions.get('temp_min_celsius', 0) and
                soil.lower() == conditions.get('soil', '').lower()):
                
                matching_crops.append(RecommendationItem(
                    crop=rule.get('crop', 'Unknown'),
                    advice=rule.get('advice', 'No specific advice available.'),
                    weather_condition=weather_condition,
                    temperature=f"{current_temp}°C"
                ))

        if matching_crops:
            return CropRecommendationResponse(
                status="success",
                city=city,
                soil_type=soil,
                recommendations=matching_crops,
                weather=weather_info
            )

        return CropRecommendationResponse(
            status="info",
            city=city,
            soil_type=soil,
            message="No specific crop recommendations found for the current conditions.",
            suggestions=["Consult with local agricultural experts for personalized advice."],
            weather=weather_info
        )
        
    except Exception as e:
        logger.error(f"Error in recommend_crop: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again later."
        )
