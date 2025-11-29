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

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import predict, health, recordings, websocket, export, analysis, species, i18n, metrics
from app.api.routes import xeno_canto, export_geo
from app.core.config import get_settings
from app.db.database import init_db
from app.services.model_registry import model_registry
from app.core.cache import cache_service
from app.i18n import LanguageMiddleware
from app.core.logging_config import setup_logging
from app.core.metrics import metrics as metrics_collector, track_model_loaded, MetricsMiddleware
from app.core.rate_limiter import RateLimitMiddleware

# Get settings first
settings = get_settings()

# Configure structured logging
setup_logging(level="INFO", json_format=not settings.DEBUG)
logger = logging.getLogger(__name__)


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

    # Connect to cache
    logger.info("Connecting to cache...")
    await cache_service.connect()

    # Load ML models
    logger.info("Loading ML models...")
    await model_registry.load_models()
    loaded_models = list(model_registry.models.keys())
    logger.info(f"Loaded models: {loaded_models}")
    
    # Track loaded models in metrics
    for model_name in loaded_models:
        track_model_loaded(model_name, loaded=True)

    yield

    # Cleanup
    logger.info("Shutting down BirdSound API...")
    for model_name in model_registry.models.keys():
        track_model_loaded(model_name, loaded=False)
    await model_registry.unload_models()
    await cache_service.disconnect()


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

# Language middleware for i18n
app.add_middleware(LanguageMiddleware)

# Metrics middleware for request tracking
app.add_middleware(MetricsMiddleware)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(predict.router, prefix="/api/v1", tags=["Prediction"])
app.include_router(recordings.router, prefix="/api/v1", tags=["Recordings"])
app.include_router(export.router, prefix="/api/v1", tags=["Export"])
app.include_router(export_geo.router, prefix="/api/v1", tags=["Export GEO"])
app.include_router(analysis.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(species.router, prefix="/api/v1", tags=["Species"])
app.include_router(i18n.router, prefix="/api/v1", tags=["i18n"])
app.include_router(metrics.router, tags=["Metrics"])
app.include_router(websocket.router, tags=["WebSocket"])
app.include_router(xeno_canto.router, prefix="/api/v1", tags=["Xeno-canto"])


# Static files for frontend
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")


@app.get("/")
async def root():
    """Serve the frontend dashboard."""
    index_path = static_path / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/api")
async def api_info():
    """API endpoint with information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "predict": "/api/v1/predict",
            "recordings": "/api/v1/recordings",
            "models": "/api/v1/models",
            "websocket_live": "/ws/live",
            "websocket_stream": "/ws/stream",
        }
    }
