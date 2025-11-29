"""
Prediction service orchestrating audio processing and model inference.
"""
import logging
import time
from typing import List, Optional
from uuid import UUID
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.audio import AudioChunkRequest
from app.schemas.prediction import (
    PredictionResponse,
    ModelPrediction,
    SpeciesPrediction,
    ConsensusPrediction,
)
from app.services.audio_processor import audio_processor
from app.services.model_registry import model_registry
from app.db.models import Recording, Prediction
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PredictionService:
    """
    Service for processing audio and running predictions.

    Orchestrates:
    1. Audio preprocessing
    2. Multi-model inference
    3. Consensus computation
    4. Database storage
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        """Initialize prediction service."""
        self.db = db

    async def process_audio_chunk(
        self,
        request: AudioChunkRequest,
        store_in_db: bool = True
    ) -> PredictionResponse:
        """
        Process a single audio chunk and return predictions.

        Args:
            request: Audio chunk request with audio data and metadata
            store_in_db: Whether to store results in database

        Returns:
            PredictionResponse with all model predictions and consensus
        """
        start_time = time.perf_counter()

        # 1. Preprocess audio
        logger.debug(f"Processing audio from device {request.device_id}")
        audio = audio_processor.prepare_for_model(
            audio_base64=request.audio_base64,
            audio_format=request.audio_format.value,
            source_sample_rate=request.sample_rate,
            normalize=True
        )

        # Check for silence
        if audio_processor.detect_silence(audio):
            logger.debug("Audio is mostly silence, skipping prediction")
            # Return empty prediction
            return self._create_empty_response(request)

        # 2. Run all models
        model_outputs = await model_registry.predict_all(
            audio=audio,
            lat=request.latitude,
            lon=request.longitude,
            model_names=request.models
        )

        # 3. Compute consensus
        consensus_data = model_registry.compute_consensus(
            model_outputs,
            method="weighted_average"
        )

        # 4. Build response
        recording_id = uuid.uuid4()
        processing_time_ms = int((time.perf_counter() - start_time) * 1000)

        model_predictions = [
            ModelPrediction(
                model_name=output.model_name,
                model_version=output.model_version,
                inference_time_ms=output.inference_time_ms,
                predictions=[
                    SpeciesPrediction(
                        species_code=p.species_code,
                        species_scientific=p.species_scientific,
                        species_common=p.species_common,
                        confidence=p.confidence,
                        rank=p.rank
                    )
                    for p in output.predictions
                ]
            )
            for output in model_outputs
        ]

        consensus = ConsensusPrediction(
            species_code=consensus_data["species_code"],
            species_scientific=consensus_data["species_scientific"],
            species_common=consensus_data["species_common"],
            confidence=consensus_data["confidence"],
            method=consensus_data["method"],
            agreement_count=consensus_data["agreement_count"],
            total_models=consensus_data["total_models"]
        )

        response = PredictionResponse(
            recording_id=recording_id,
            timestamp_utc=request.timestamp_utc,
            processing_time_ms=processing_time_ms,
            model_predictions=model_predictions,
            consensus=consensus,
            latitude=request.latitude,
            longitude=request.longitude
        )

        # 5. Store in database
        if store_in_db and self.db is not None:
            await self._store_prediction(request, response, model_outputs)

        logger.info(
            f"Processed audio: {consensus.species_common} "
            f"({consensus.confidence:.2f}) in {processing_time_ms}ms"
        )

        return response

    def _create_empty_response(self, request: AudioChunkRequest) -> PredictionResponse:
        """Create empty response for silent audio."""
        return PredictionResponse(
            recording_id=uuid.uuid4(),
            timestamp_utc=request.timestamp_utc,
            processing_time_ms=0,
            model_predictions=[],
            consensus=ConsensusPrediction(
                species_code=None,
                species_scientific=None,
                species_common="No bird sound detected",
                confidence=0.0,
                method="silence_detection",
                agreement_count=0,
                total_models=0
            ),
            latitude=request.latitude,
            longitude=request.longitude
        )

    async def _store_prediction(
        self,
        request: AudioChunkRequest,
        response: PredictionResponse,
        model_outputs
    ) -> None:
        """Store prediction results in database."""
        try:
            # Create recording entry
            recording = Recording(
                id=response.recording_id,
                device_id=request.device_id,
                timestamp_utc=request.timestamp_utc,
                latitude=request.latitude,
                longitude=request.longitude,
                duration_sec=settings.AUDIO_WINDOW_SIZE_SEC,
                sample_rate=request.sample_rate,
                audio_format=request.audio_format.value,
                processing_time_ms=response.processing_time_ms,
                consensus_species=response.consensus.species_common,
                consensus_confidence=response.consensus.confidence,
                consensus_method=response.consensus.method,
                metadata=request.metadata
            )

            self.db.add(recording)

            # Create prediction entries for each model
            for output in model_outputs:
                for pred in output.predictions:
                    prediction = Prediction(
                        recording_id=response.recording_id,
                        model_name=output.model_name,
                        model_version=output.model_version,
                        species_code=pred.species_code,
                        species_scientific=pred.species_scientific,
                        species_common=pred.species_common,
                        confidence=pred.confidence,
                        rank=pred.rank,
                        inference_time_ms=output.inference_time_ms
                    )
                    self.db.add(prediction)

            await self.db.flush()
            logger.debug(f"Stored recording {response.recording_id} in database")

        except Exception as e:
            logger.error(f"Failed to store prediction in database: {e}")
            # Don't raise - we still want to return the prediction

    async def get_recent_predictions(
        self,
        device_id: Optional[str] = None,
        limit: int = 100
    ) -> List[Recording]:
        """Get recent predictions from database."""
        if self.db is None:
            return []

        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        query = (
            select(Recording)
            .options(selectinload(Recording.predictions))
            .order_by(Recording.timestamp_utc.desc())
            .limit(limit)
        )

        if device_id:
            query = query.where(Recording.device_id == device_id)

        result = await self.db.execute(query)
        return result.scalars().all()
