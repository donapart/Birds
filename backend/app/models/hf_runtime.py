"""
HuggingFace runtime model implementations.

These implementations use the actual HuggingFace transformers library
for real ML inference.
"""
import logging
import time
from typing import Optional, List
import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


class DimaBirdRuntimeModel(BaseBirdModel):
    """
    DimaBird runtime model using HuggingFace transformers.
    
    Uses dima806/bird_sounds_classification model for European bird species.
    """
    
    def __init__(
        self,
        sample_rate: int = 16000,
        top_n: int = 5,
        min_confidence: float = 0.1,
    ):
        """
        Initialize DimaBird runtime model.
        
        Args:
            sample_rate: Expected sample rate for audio
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
        """
        super().__init__(
            name="DimaBird",
            version="dima806/bird_sounds_classification",
            top_n=top_n,
            min_confidence=min_confidence,
        )
        self.sample_rate = sample_rate
        self.model = None
        self.processor = None
        self.id2label = {}
    
    async def load(self) -> None:
        """Load the model from HuggingFace Hub."""
        logger.info(f"Loading {self.name} runtime model from HuggingFace...")
        
        try:
            from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
            import torch
            
            model_id = "dima806/bird_sounds_classification"
            
            # Load processor and model
            self.processor = AutoFeatureExtractor.from_pretrained(model_id)
            self.model = AutoModelForAudioClassification.from_pretrained(model_id)
            self.model.eval()
            
            # Get label mapping
            self.id2label = self.model.config.id2label
            
            # Move to GPU if available
            if torch.cuda.is_available():
                self.model = self.model.cuda()
                logger.info("Using CUDA for inference")
            
            self._loaded = True
            logger.info(f"{self.name} runtime model loaded successfully ({len(self.id2label)} classes)")
            
        except ImportError as e:
            logger.error(f"Failed to load {self.name}: Missing dependencies - {e}")
            logger.info("Install with: pip install transformers torch")
            raise
        except Exception as e:
            logger.error(f"Failed to load {self.name}: {e}")
            raise
    
    async def unload(self) -> None:
        """Unload the model and free resources."""
        logger.info(f"Unloading {self.name} runtime model...")
        self.model = None
        self.processor = None
        self.id2label = {}
        self._loaded = False
        
        # Force garbage collection
        import gc
        gc.collect()
        
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
    
    async def predict(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        **kwargs
    ) -> ModelOutput:
        """
        Run inference on audio data.
        
        Args:
            audio_data: Audio samples as numpy array
            sample_rate: Sample rate of the audio
            
        Returns:
            ModelOutput with predictions
        """
        if not self._loaded:
            raise RuntimeError(f"{self.name} model not loaded")
        
        import torch
        
        start_time = time.time()
        
        # Resample if necessary
        if sample_rate != self.sample_rate:
            audio_data = self._resample(audio_data, sample_rate, self.sample_rate)
        
        # Process audio
        inputs = self.processor(
            audio_data,
            sampling_rate=self.sample_rate,
            return_tensors="pt",
        )
        
        # Move to same device as model
        if next(self.model.parameters()).is_cuda:
            inputs = {k: v.cuda() for k, v in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
        
        # Get top predictions
        probs_np = probs.cpu().numpy()[0]
        top_indices = np.argsort(probs_np)[::-1][:self.top_n]
        
        predictions = []
        for rank, idx in enumerate(top_indices, 1):
            conf = float(probs_np[idx])
            if conf >= self.min_confidence:
                species_name = self.id2label.get(idx, f"Unknown_{idx}")
                predictions.append(PredictionResult(
                    species=species_name,
                    scientific_name=None,  # Model doesn't provide scientific names
                    confidence=round(conf, 4),
                    rank=rank,
                ))
        
        processing_time = (time.time() - start_time) * 1000
        
        return ModelOutput(
            model_name=self.name,
            model_version=self.version,
            predictions=predictions,
            processing_time_ms=processing_time,
            metadata={
                "runtime": True,
                "sample_rate": self.sample_rate,
                "input_sample_rate": sample_rate,
                "audio_duration_sec": len(audio_data) / sample_rate,
                "num_classes": len(self.id2label),
            }
        )
    
    def _resample(
        self,
        audio_data: np.ndarray,
        orig_sr: int,
        target_sr: int
    ) -> np.ndarray:
        """Resample audio to target sample rate."""
        try:
            import librosa
            return librosa.resample(audio_data, orig_sr=orig_sr, target_sr=target_sr)
        except ImportError:
            # Simple linear interpolation fallback
            ratio = target_sr / orig_sr
            new_length = int(len(audio_data) * ratio)
            indices = np.linspace(0, len(audio_data) - 1, new_length)
            return np.interp(indices, np.arange(len(audio_data)), audio_data)
