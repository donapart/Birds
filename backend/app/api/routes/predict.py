"""
Prediction API endpoints.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.audio import AudioChunkRequest, AudioChunkBatchRequest
from app.schemas.prediction import (
    PredictionResponse,
    BatchPredictionResponse,
)
from app.services.prediction_service import PredictionService
from app.services.model_registry import model_registry
from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_bird_sound(
    request: AudioChunkRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze an audio chunk for bird sounds.

    Accepts a base64-encoded audio chunk with metadata (timestamp, GPS coordinates).
    Returns predictions from all loaded models plus a consensus prediction.

    The audio will be:
    1. Decoded from base64
    2. Resampled to 48kHz if needed
    3. Normalized
    4. Processed by all available ML models

    Response includes:
    - Per-model predictions with confidence scores
    - Consensus prediction combining all models
    - Recording ID for future reference
    """
    try:
        service = PredictionService(db=db)
        response = await service.process_audio_chunk(request, store_in_db=True)
        return response

    except ValueError as e:
        logger.error(f"Invalid request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction processing failed")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    request: AudioChunkBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Process multiple audio chunks in a single request.

    Useful for offline scenarios where device batches multiple recordings
    before uploading.

    Limited to 10 chunks per request.
    """
    import time
    start_time = time.perf_counter()

    service = PredictionService(db=db)
    predictions = []

    for chunk in request.chunks:
        try:
            pred = await service.process_audio_chunk(chunk, store_in_db=True)
            predictions.append(pred)
        except Exception as e:
            logger.error(f"Failed to process chunk: {e}")
            # Continue with other chunks

    total_time = int((time.perf_counter() - start_time) * 1000)

    return BatchPredictionResponse(
        predictions=predictions,
        total_processing_time_ms=total_time
    )


@router.post("/predict/quick", response_model=PredictionResponse)
async def predict_quick(
    request: AudioChunkRequest,
):
    """
    Quick prediction without database storage.

    Faster endpoint for real-time feedback where persistence isn't needed.
    Uses the same ML models but skips database operations.
    """
    try:
        service = PredictionService(db=None)
        response = await service.process_audio_chunk(request, store_in_db=False)
        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Quick prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction processing failed")


@router.get("/models")
async def list_models():
    """
    List all available ML models.

    Returns information about each loaded model including:
    - Model name
    - Model version
    - Whether it's currently loaded
    """
    models = []
    for name, model in model_registry.models.items():
        models.append({
            "name": model.model_name,
            "version": model.model_version,
            "is_loaded": model.is_loaded,
            "top_n": model.top_n,
            "min_confidence": model.min_confidence
        })

    return {
        "models": models,
        "total": len(models)
    }


@router.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get detailed information about a specific model."""
    model = model_registry.get_model(model_name)

    if model is None:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

    return {
        "name": model.model_name,
        "version": model.model_version,
        "is_loaded": model.is_loaded,
        "top_n": model.top_n,
        "min_confidence": model.min_confidence,
        "class": model.__class__.__name__
    }
