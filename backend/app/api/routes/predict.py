"""
Prediction API endpoints.
"""
import logging
import base64
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.audio import AudioChunkRequest, AudioChunkBatchRequest, AudioFormat
from app.schemas.prediction import (
    PredictionResponse,
    BatchPredictionResponse,
    AudioEnhancementSettings,
)
from app.services.prediction_service import PredictionService
from app.services.model_registry import model_registry
from app.services.audio_enhancement import audio_enhancer, EnhancementSettings
from app.db.database import get_db
from app.api.dependencies import get_api_key

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict", response_model=PredictionResponse)
async def predict_bird_sound(
    request: AudioChunkRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(get_api_key)
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
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction processing failed: {str(e)}")


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
    api_key: str = Depends(get_api_key)
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
        raise HTTPException(status_code=500, detail="Prediction failed")


@router.post("/predict/upload")
async def predict_upload(
    file: UploadFile = File(...),
    device_id: str = Form(default="mobile-app"),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    model: Optional[str] = Form(default=None),
    # Audio Enhancement Options (all optional, default=off)
    enhancement_preset: Optional[str] = Form(default=None, description="Preset: none, light, moderate, aggressive, noisy_environment, wind_reduction"),
    bandpass_enabled: bool = Form(default=False),
    bandpass_low_freq: int = Form(default=1000),
    bandpass_high_freq: int = Form(default=8000),
    noise_reduction_enabled: bool = Form(default=False),
    noise_reduction_strength: float = Form(default=1.0),
    auto_gain_enabled: bool = Form(default=False),
    auto_gain_target_db: float = Form(default=-3.0),
    spectral_gate_enabled: bool = Form(default=False),
    spectral_gate_threshold_db: float = Form(default=-40.0),
    highpass_enabled: bool = Form(default=False),
    highpass_freq: int = Form(default=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload audio file for prediction with GPS coordinates and audio enhancement.
    
    Accepts multipart form data with:
    - file: Audio file (m4a, wav, mp3)
    - device_id: Device identifier
    - latitude/longitude: GPS coordinates
    - model: Optional specific model to use
    
    Audio Enhancement Options (all optional, off by default):
    - enhancement_preset: Use a preset (none, light, moderate, aggressive, noisy_environment, wind_reduction)
    - bandpass_enabled: Filter to bird frequencies (1-8 kHz)
    - noise_reduction_enabled: AI noise reduction
    - auto_gain_enabled: Automatic volume normalization
    - spectral_gate_enabled: Remove quiet background sounds
    - highpass_enabled: Remove low-frequency rumble
    
    Stores results with GPS and timestamp in database.
    """
    from datetime import timezone
    import soundfile as sf
    import numpy as np
    import io
    
    # Read audio file
    audio_bytes = await file.read()
    
    # Decode audio to numpy array for enhancement
    try:
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)  # Convert to mono
        audio_data = audio_data.astype(np.float32)
    except Exception as e:
        logger.warning(f"Could not decode with soundfile: {e}, trying raw approach")
        # Fallback: pass through without enhancement
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        audio_data = None
        sample_rate = 48000
    
    # Apply audio enhancement if audio was decoded
    enhancement_result = {}
    if audio_data is not None:
        # Determine enhancement settings
        if enhancement_preset:
            presets = audio_enhancer.get_presets()
            if enhancement_preset in presets:
                enhancement_settings = presets[enhancement_preset]
                enhancement_result["preset_used"] = enhancement_preset
            else:
                logger.warning(f"Unknown preset: {enhancement_preset}, using custom settings")
                enhancement_settings = EnhancementSettings(
                    bandpass_enabled=bandpass_enabled,
                    bandpass_low_freq=bandpass_low_freq,
                    bandpass_high_freq=bandpass_high_freq,
                    noise_reduction_enabled=noise_reduction_enabled,
                    noise_reduction_strength=noise_reduction_strength,
                    auto_gain_enabled=auto_gain_enabled,
                    auto_gain_target_db=auto_gain_target_db,
                    spectral_gate_enabled=spectral_gate_enabled,
                    spectral_gate_threshold_db=spectral_gate_threshold_db,
                    highpass_enabled=highpass_enabled,
                    highpass_freq=highpass_freq,
                )
        else:
            enhancement_settings = EnhancementSettings(
                bandpass_enabled=bandpass_enabled,
                bandpass_low_freq=bandpass_low_freq,
                bandpass_high_freq=bandpass_high_freq,
                noise_reduction_enabled=noise_reduction_enabled,
                noise_reduction_strength=noise_reduction_strength,
                auto_gain_enabled=auto_gain_enabled,
                auto_gain_target_db=auto_gain_target_db,
                spectral_gate_enabled=spectral_gate_enabled,
                spectral_gate_threshold_db=spectral_gate_threshold_db,
                highpass_enabled=highpass_enabled,
                highpass_freq=highpass_freq,
            )
        
        # Apply enhancements
        audio_data, applied = audio_enhancer.enhance(audio_data, sample_rate, enhancement_settings)
        enhancement_result["applied_enhancements"] = applied
        
        # Re-encode to WAV format for model processing
        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, audio_data, sample_rate, format='WAV')
        wav_buffer.seek(0)
        audio_base64 = base64.b64encode(wav_buffer.read()).decode('utf-8')
        audio_format = AudioFormat.WAV
    else:
        # No enhancement possible, use original
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        filename = file.filename or "audio.m4a"
        if filename.endswith('.wav'):
            audio_format = AudioFormat.WAV
        elif filename.endswith('.mp3'):
            audio_format = AudioFormat.MP3
        else:
            audio_format = AudioFormat.M4A
    
    # Create request
    request = AudioChunkRequest(
        device_id=device_id,
        timestamp_utc=datetime.now(timezone.utc),
        audio_base64=audio_base64,
        audio_format=audio_format,
        sample_rate=sample_rate,
        latitude=latitude,
        longitude=longitude,
        models=[model] if model else None
    )
    
    try:
        service = PredictionService(db=db)
        response = await service.process_audio_chunk(request, store_in_db=True)
        
        # Return simplified response for mobile with enhancement info
        return {
            "recording_id": str(response.recording_id),
            "timestamp": response.timestamp_utc.isoformat(),
            "latitude": latitude,
            "longitude": longitude,
            "processing_time_ms": response.processing_time_ms,
            "audio_enhancement": enhancement_result,
            "predictions": [
                {
                    "species": p.species_common,
                    "scientific_name": p.species_scientific,
                    "confidence": p.confidence,
                    "model": mp.model_name
                }
                for mp in response.model_predictions
                for p in mp.predictions
            ],
            "consensus": {
                "species": response.consensus.species_common,
                "confidence": response.consensus.confidence,
                "models_agree": response.consensus.agreement_count
            }
        }
    except Exception as e:
        logger.error(f"Upload prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audio-enhancement/presets")
async def get_enhancement_presets():
    """
    Get available audio enhancement presets.
    
    Returns all predefined presets with their settings.
    Use preset name in the 'enhancement_preset' parameter.
    """
    presets = audio_enhancer.get_presets()
    return {
        "presets": {
            name: settings.to_dict()
            for name, settings in presets.items()
        },
        "description": {
            "none": "No enhancement (original audio)",
            "light": "Subtle enhancement: auto-gain + highpass filter",
            "moderate": "Balanced: bandpass filter + auto-gain",
            "aggressive": "Strong: all filters + noise reduction",
            "noisy_environment": "Heavy filtering for noisy recordings",
            "wind_reduction": "Optimized for wind noise removal"
        }
    }


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
            "name": getattr(model, 'model_name', getattr(model, 'name', name)),
            "version": getattr(model, 'version', '1.0.0'),
            "is_loaded": getattr(model, 'is_loaded', getattr(model, '_loaded', False)),
            "top_n": getattr(model, 'top_n', 5),
            "min_confidence": getattr(model, 'min_confidence', 0.1)
        })
    
    result = {
        "models": models,
        "total": len(models)
    }
    
    # Add helpful error info if no models loaded
    if len(models) == 0:
        result["error"] = "Keine Modelle geladen"
        result["help"] = {
            "message": "Prüfe die Server-Logs und .env Konfiguration",
            "quick_fix": "Setze USE_MODEL_STUBS=true in .env für Entwicklung",
            "documentation": "Siehe REQUIREMENTS_ML.md für Production-Setup"
        }

    return result


@router.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get detailed information about a specific model."""
    model = model_registry.get_model(model_name)

    if model is None:
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")

    return {
        "name": getattr(model, 'model_name', getattr(model, 'name', model_name)),
        "version": getattr(model, 'version', '1.0.0'),
        "is_loaded": getattr(model, 'is_loaded', getattr(model, '_loaded', False)),
        "top_n": getattr(model, 'top_n', 5),
        "min_confidence": getattr(model, 'min_confidence', 0.1),
        "class": model.__class__.__name__
    }
