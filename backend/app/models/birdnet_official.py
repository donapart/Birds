"""
BirdNET official package wrapper.

This implementation uses the official BirdNET Python package (pip install birdnet).
New API since birdnet v0.2.0+ uses model_loader.load() instead of Analyzer class.
"""
import asyncio
import logging
import time
from typing import Optional, List
import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


class BirdNETOfficialModel(BaseBirdModel):
    """
    BirdNET model using the official Python package.
    
    Install with: pip install birdnet
    """
    
    def __init__(
        self,
        sample_rate: int = 48000,
        top_n: int = 5,
        min_confidence: float = 0.1,
        use_location_filter: bool = True,
    ):
        """
        Initialize BirdNET official model.
        
        Args:
            sample_rate: Expected sample rate (BirdNET uses 48kHz)
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
            use_location_filter: Whether to use location-based filtering
        """
        super().__init__(
            name="BirdNET",
            version="2.4-official",
            top_n=top_n,
            min_confidence=min_confidence,
        )
        self.sample_rate = sample_rate
        self.use_location_filter = use_location_filter
        self.model = None
        self.geo_model = None
    
    async def load(self) -> None:
        """Load the BirdNET model using new API."""
        logger.info(f"Loading {self.name} official model...")
        
        try:
            from birdnet import model_loader
            
            # Load acoustic model (v2.4 with TFLite backend)
            self.model = model_loader.load('acoustic', '2.4', 'tf')
            logger.info(f"BirdNET acoustic model loaded: {self.model.n_species} species")
            
            # Optionally load geographic model for location filtering
            if self.use_location_filter:
                try:
                    self.geo_model = model_loader.load('geo', '2.4', 'tf')
                    logger.info("BirdNET geo model loaded for location filtering")
                except Exception as e:
                    logger.warning(f"Geo model not available: {e}")
                    self.geo_model = None
            
            self._loaded = True
            logger.info(f"{self.name} official model loaded successfully")
            
        except ImportError as e:
            logger.error(f"Failed to load {self.name}: BirdNET package not installed - {e}")
            logger.info("Install with: pip install birdnet")
            self._loaded = False
        except Exception as e:
            logger.error(f"Failed to load {self.name}: {e}")
            self._loaded = False
    
    async def unload(self) -> None:
        """Unload the model."""
        logger.info(f"Unloading {self.name} official model...")
        self.model = None
        self.geo_model = None
        self._loaded = False
    
    def _run_predict(self, audio_data: np.ndarray, sample_rate: int) -> 'AcousticPredictionResultBase':
        """Run BirdNET prediction synchronously (for use with run_in_executor)."""
        return self.model.predict_arrays(
            (audio_data, sample_rate),
            top_k=self.top_n,
            default_confidence_threshold=0.0,
            apply_sigmoid=True,
        )
    
    async def predict(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        date: Optional[str] = None,
        **kwargs
    ) -> ModelOutput:
        """
        Run inference on audio data using BirdNET API.
        
        Args:
            audio_data: Audio samples as numpy array
            sample_rate: Sample rate of the audio
            latitude: Optional latitude for location filtering
            longitude: Optional longitude for location filtering
            date: Optional date string (YYYY-MM-DD)
            
        Returns:
            ModelOutput with predictions
        """
        if not self._loaded or self.model is None:
            raise RuntimeError(f"{self.name} model not loaded")
        
        start_time = time.time()
        
        # Resample if needed (BirdNET expects 48kHz)
        if sample_rate != self.model.get_sample_rate():
            from scipy import signal
            num_samples = int(len(audio_data) * self.model.get_sample_rate() / sample_rate)
            audio_data = signal.resample(audio_data, num_samples)
            sample_rate = self.model.get_sample_rate()
        
        # Ensure correct shape and dtype
        audio_data = audio_data.astype(np.float32)
        
        # Run prediction using predict_arrays API
        # Use run_in_executor to avoid blocking the event loop
        # (BirdNET internally uses multiprocessing)
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, self._run_predict, audio_data, sample_rate
            )
            
            # result.species_ids: (n_inputs, n_segments, top_k)
            # result.species_probs: (n_inputs, n_segments, top_k)
            # result.species_list: list of "Scientific_Name_Common Name"
            species_list = result.species_list
            species_ids = result.species_ids
            species_probs = result.species_probs
            
            # Aggregate across segments: take max confidence per species
            best_by_species = {}
            n_segments = species_ids.shape[1]
            for seg in range(n_segments):
                for k in range(species_ids.shape[2]):
                    sp_idx = int(species_ids[0, seg, k])
                    prob = float(species_probs[0, seg, k])
                    if prob >= self.min_confidence and sp_idx < len(species_list):
                        sp_name = species_list[sp_idx]
                        if sp_name not in best_by_species or prob > best_by_species[sp_name]:
                            best_by_species[sp_name] = prob
            
            # Sort by confidence and build predictions
            sorted_preds = sorted(best_by_species.items(), key=lambda x: x[1], reverse=True)
            
            predictions = []
            for species_code, confidence in sorted_preds[:self.top_n]:
                # Parse species code (format: "Scientific_Name_Common Name")
                parts = species_code.rsplit('_', 1)
                if len(parts) == 2:
                    scientific_name = parts[0].replace('_', ' ')
                    common_name = parts[1]
                else:
                    scientific_name = species_code
                    common_name = species_code
                
                predictions.append(PredictionResult(
                    species=common_name,
                    scientific_name=scientific_name,
                    confidence=round(float(confidence), 4),
                    rank=len(predictions) + 1,
                ))
            
        except Exception as e:
            logger.error(f"BirdNET prediction failed: {e}")
            predictions = []
        
        processing_time = (time.time() - start_time) * 1000
        
        return ModelOutput(
            model_name=self.name,
            model_version=self.version,
            predictions=predictions,
            processing_time_ms=processing_time,
            metadata={
                "runtime": True,
                "official_package": True,
                "sample_rate": sample_rate,
                "audio_duration_sec": len(audio_data) / sample_rate,
                "location_filter": self.use_location_filter,
                "location": {"lat": latitude, "lon": longitude} if latitude else None,
                "n_species": self.model.n_species if self.model else 0,
            }
        )
