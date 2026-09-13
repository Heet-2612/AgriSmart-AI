"""FastAPI route for Sustainability Score and Simulated IoT Telemetry."""

from fastapi import APIRouter, status
from app.schemas import (
    SustainabilityScoreRequest,
    SustainabilityScoreResponse,
    IoTPresetsResponse,
    ErrorResponse,
)
from app.services.sustainability_service import SustainabilityService
from app.services.iot_sensor_service import IoTSensorService

router = APIRouter(prefix="/api", tags=["Sustainability"])


@router.post(
    "/sustainability-score",
    response_model=SustainabilityScoreResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid parameters"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
    summary="Calculate explainable 100-point sustainability and water-impact score",
)
async def calculate_sustainability_score(
    request: SustainabilityScoreRequest,
) -> SustainabilityScoreResponse:
    """Calculate deterministic farm sustainability score across 4 transparent dimensions:
    - Water Conservation & Irrigation Timing (0–40 pts)
    - Microclimate & Weather Alignment (0–30 pts)
    - Soil Moisture & Root-Zone Balance (0–15 pts)
    - Crop Rotation & Agro-Ecological Compatibility (0–15 pts)
    """
    return SustainabilityService.calculate_score(request)


@router.get(
    "/sustainability/iot-telemetry",
    response_model=IoTPresetsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get simulated IoT field sensor presets",
)
async def get_iot_telemetry_presets() -> IoTPresetsResponse:
    """Retrieve deterministic simulated IoT sensor presets for prototype and demo validation."""
    return IoTSensorService.get_all_presets()
