"""
Google Perch Runtime Model for bird sound classification.

Perch is a global bird sound classifier trained on 15,000+ species.
https://github.com/google-research/perch
"""
import logging
from pathlib import Path
from typing import Optional, List

import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


class PerchRuntimeModel(BaseBirdModel):
    """
    Google Perch bird classifier using TensorFlow Hub or SavedModel.
    
    Perch provides embeddings and classification for ~15,000 bird species worldwide.
    """
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        sample_rate: int = 32000,  # Perch expects 32kHz
        top_n: int = 5,
        min_confidence: float = 0.1,
    ):
        self.model_path = model_path
        self.sample_rate = sample_rate
        self.top_n = top_n
        self.min_confidence = min_confidence
        self._model = None
        self._labels = None
        self._is_loaded = False
        
    @property
    def name(self) -> str:
        return "Perch"
    
    @property
    def model_name(self) -> str:
        return self.name
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    @property
    def description(self) -> str:
        return "Google Perch - Global bird classifier (15,000+ species)"
    
    @property
    def species_count(self) -> int:
        return len(self._labels) if self._labels else 15000
    
    @property
    def is_loaded(self) -> bool:
        return self._is_loaded
    
    async def load(self) -> None:
        """Load Perch model from TensorFlow Hub or local SavedModel."""
        try:
            import tensorflow as tf
            import tensorflow_hub as hub
            
            # Try local SavedModel first
            if self.model_path and Path(self.model_path).exists():
                logger.info(f"Loading Perch from local path: {self.model_path}")
                self._model = tf.saved_model.load(self.model_path)
            else:
                # Fall back to TensorFlow Hub
                logger.info("Loading Perch from TensorFlow Hub...")
                # Perch embedding model from TF Hub
                hub_url = "https://tfhub.dev/google/bird-vocalization-classifier/1"
                self._model = hub.load(hub_url)
            
            # Load labels (Perch uses Xeno-canto species codes)
            self._labels = self._load_labels()
            
            self._is_loaded = True
            logger.info(f"Perch model loaded successfully ({len(self._labels)} species)")
            
        except ImportError as e:
            logger.warning(f"Perch requires tensorflow and tensorflow_hub: {e}")
            self._is_loaded = False
        except Exception as e:
            logger.error(f"Failed to load Perch model: {e}")
            self._is_loaded = False
    
    def _load_labels(self) -> List[str]:
        """Load species labels for Perch model from TF Hub cached assets."""
        # Try to load from model's class_names attribute
        try:
            if hasattr(self._model, 'class_names'):
                return list(self._model.class_names.numpy())
        except Exception:
            pass
        
        # Find label.csv in TF Hub cache directory
        import glob
        import csv
        
        tfhub_dirs = glob.glob("/tmp/tfhub_modules/*/assets/label.csv")
        if not tfhub_dirs:
            # Also check standard cache locations
            import os
            home = os.path.expanduser("~")
            tfhub_dirs = glob.glob(f"{home}/.cache/tfhub_modules/*/assets/label.csv")
        
        for label_path in tfhub_dirs:
            try:
                labels = []
                with open(label_path, 'r') as f:
                    reader = csv.reader(f)
                    header = next(reader)  # Skip header row (ebird2021,comment)
                    for row in reader:
                        if row:
                            labels.append(row[0])  # eBird species code
                if labels:
                    logger.info(f"Loaded {len(labels)} Perch labels from {label_path}")
                    return labels
            except Exception as e:
                logger.warning(f"Failed to read labels from {label_path}: {e}")
        
        logger.warning("No Perch labels found - predictions will use species indices")
        return []
    
    async def unload(self) -> None:
        """Unload model to free memory."""
        self._model = None
        self._labels = None
        self._is_loaded = False
        logger.info("Perch model unloaded")
    
    async def predict(
        self,
        audio: np.ndarray,
        sample_rate: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> ModelOutput:
        """
        Run prediction on audio segment.
        
        Args:
            audio: Audio waveform as numpy array
            sample_rate: Sample rate of audio
            latitude: Latitude for geographic filtering (optional)
            longitude: Longitude for geographic filtering (optional)
            
        Returns:
            ModelOutput with predictions
        """
        if not self._is_loaded or self._model is None:
            return ModelOutput(
                model_name=self.name,
                model_version=self.version,
                predictions=[],
            )
        
        try:
            import tensorflow as tf
            from scipy import signal
            
            # Resample if needed (Perch expects 32kHz)
            if sample_rate != self.sample_rate:
                num_samples = int(len(audio) * self.sample_rate / sample_rate)
                audio = signal.resample(audio, num_samples)
            
            # Perch requires exactly 160000 samples (5 seconds at 32kHz)
            expected_samples = 160000
            if len(audio) < expected_samples:
                # Pad with zeros
                audio = np.pad(audio, (0, expected_samples - len(audio)))
            elif len(audio) > expected_samples:
                # Trim to expected length
                audio = audio[:expected_samples]
            
            # Ensure float32 and correct shape (1, 160000)
            audio = audio.astype(np.float32)
            if audio.ndim == 1:
                audio = audio[np.newaxis, :]  # Add batch dimension
            
            # Run inference
            # Perch TF Hub model uses 'serving_default' signature
            if hasattr(self._model, 'signatures') and 'serving_default' in self._model.signatures:
                outputs = self._model.signatures['serving_default'](tf.constant(audio))
            elif callable(self._model):
                outputs = self._model(audio)
            else:
                raise RuntimeError("Perch model has no usable inference method")
            
            # Extract logits/probabilities
            # TF Hub Perch returns: output_0 = logits (1, 10932), output_1 = embeddings (1, 1280)
            if isinstance(outputs, dict):
                logits = outputs.get('output_0', outputs.get('logits', list(outputs.values())[0]))
            else:
                logits = outputs
            
            # Convert to probabilities
            probs = tf.nn.softmax(logits).numpy().squeeze()
            
            # Get top predictions
            top_indices = np.argsort(probs)[::-1][:self.top_n]
            
            predictions = []
            for idx in top_indices:
                confidence = float(probs[idx])
                if confidence >= 0.01:  # Use low threshold, let prediction_service filter
                    species_code = self._labels[idx] if idx < len(self._labels) else f"species_{idx}"
                    predictions.append(
                        PredictionResult(
                            species=species_code,
                            scientific_name="",
                            confidence=confidence,
                            rank=len(predictions) + 1,
                        )
                    )
            
            return ModelOutput(
                model_name=self.name,
                model_version=self.version,
                predictions=predictions,
            )
            
        except Exception as e:
            logger.error(f"Perch prediction failed: {e}")
            return ModelOutput(
                model_name=self.name,
                model_version=self.version,
                predictions=[],
            )
