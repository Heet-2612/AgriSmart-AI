from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import HealthResponse
from app.api.routes.predictions import router as predictions_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AgriSmart AI - Intelligent Crop Disease Classification API for Smart India Hackathon 2026"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check endpoint"
)
async def health():
    """Health check endpoint to verify backend operational status."""
    return {"status": "ok"}

app.include_router(predictions_router)
