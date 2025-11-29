"""
BirdSound API - Real-time bird sound recognition with multiple ML models.

This FastAPI application provides:
- Audio analysis endpoint for bird sound classification
- Support for multiple ML models (BirdNET, HuggingFace models)
- PostgreSQL/PostGIS storage for recordings and predictions
- Model comparison and consensus voting
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import predict, health, recordings
from app.core.config import get_settings
from app.db.database import init_db
from app.services.model_registry import model_registry

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initializes database and loads ML models on startup.
    """
    logger.info("Starting BirdSound API...")

    # Initialize database
    logger.info("Initializing database...")
    await init_db()

    # Load ML models
    logger.info("Loading ML models...")
    await model_registry.load_models()
    logger.info(f"Loaded models: {list(model_registry.models.keys())}")

    yield

    # Cleanup
    logger.info("Shutting down BirdSound API...")
    await model_registry.unload_models()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=__doc__,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])
app.include_router(recordings.router, prefix="/api/v1", tags=["Recordings"])


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }
