"""
BirdNET runtime model implementation using ONNX Runtime.

This implementation loads and runs the BirdNET ONNX model for inference.
"""
import logging
import time
from pathlib import Path
from typing import Optional, List, Dict
import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


class BirdNETRuntimeModel(BaseBirdModel):
    """
    BirdNET runtime model using ONNX Runtime.
    
    Requires the BirdNET ONNX model file and labels to be downloaded.
    """
    
    def __init__(
        self,
        model_path: str,
        labels_path: str,
        sample_rate: int = 48000,
        top_n: int = 5,
        min_confidence: float = 0.1,
    ):
        """
        Initialize BirdNET ONNX model.
        
        Args:
            model_path: Path to ONNX model file
            labels_path: Path to labels text file
            sample_rate: Expected sample rate (BirdNET uses 48kHz)
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
        """
        super().__init__(
            name="BirdNET",
            version="2.4-onnx",
            top_n=top_n,
            min_confidence=min_confidence,
        )
        self.model_path = Path(model_path)
        self.labels_path = Path(labels_path)
        self.sample_rate = sample_rate
        self.session = None
        self.labels: List[str] = []
    
    async def load(self) -> None:
        """Load the ONNX model and labels."""
        logger.info(f"Loading {self.name} ONNX model from {self.model_path}...")
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        if not self.labels_path.exists():
            raise FileNotFoundError(f"Labels file not found: {self.labels_path}")
        
        try:
            import onnxruntime as ort
            
            # Load ONNX model
            self.session = ort.InferenceSession(
                str(self.model_path),
                providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
            )
            
            # Load labels
            with open(self.labels_path, 'r', encoding='utf-8') as f:
                self.labels = [line.strip() for line in f if line.strip()]
            
            self._loaded = True
            logger.info(f"{self.name} ONNX model loaded successfully ({len(self.labels)} species)")
            
        except ImportError as e:
            logger.error(f"Failed to load {self.name}: Missing onnxruntime - {e}")
            logger.info("Install with: pip install onnxruntime")
            raise
        except Exception as e:
            logger.error(f"Failed to load {self.name}: {e}")
            raise
    
    async def unload(self) -> None:
        """Unload the model."""
        logger.info(f"Unloading {self.name} ONNX model...")
        self.session = None
        self.labels = []
        self._loaded = False
    
    async def predict(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        week: Optional[int] = None,
        **kwargs
    ) -> ModelOutput:
        """
        Run inference on audio data.
        
        Args:
            audio_data: Audio samples as numpy array
            sample_rate: Sample rate of the audio
            latitude: Optional latitude for location filtering
            longitude: Optional longitude for location filtering
            week: Optional week number (1-48) for seasonal filtering
            
        Returns:
            ModelOutput with predictions
        """
        if not self._loaded:
            raise RuntimeError(f"{self.name} model not loaded")
        
        start_time = time.time()
        
        # Resample if necessary
        if sample_rate != self.sample_rate:
            audio_data = self._resample(audio_data, sample_rate, self.sample_rate)
        
        # Prepare input (BirdNET expects specific shape)
        # Typically [batch, samples] or [batch, 1, samples]
        if audio_data.ndim == 1:
            audio_data = audio_data.reshape(1, -1)
        
        # Run inference
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: audio_data.astype(np.float32)})
        
        # Get probabilities
        probs = outputs[0][0]  # First output, first batch item
        
        # Apply softmax if logits
        if probs.min() < 0 or probs.max() > 1:
            probs = self._softmax(probs)
        
        # Get top predictions
        top_indices = np.argsort(probs)[::-1][:self.top_n]
        
        predictions = []
        for rank, idx in enumerate(top_indices, 1):
            conf = float(probs[idx])
            if conf >= self.min_confidence:
                label = self.labels[idx] if idx < len(self.labels) else f"Unknown_{idx}"
                # Parse label (format: "Scientific name_Common name")
                scientific_name, common_name = self._parse_label(label)
                
                predictions.append(PredictionResult(
                    species=common_name,
                    scientific_name=scientific_name,
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
                "model_path": str(self.model_path),
                "sample_rate": self.sample_rate,
                "input_sample_rate": sample_rate,
                "audio_duration_sec": len(audio_data.flatten()) / sample_rate,
                "num_species": len(self.labels),
                "location": {"lat": latitude, "lon": longitude} if latitude else None,
            }
        )
    
    def _parse_label(self, label: str) -> tuple:
        """Parse BirdNET label into scientific and common name."""
        if "_" in label:
            parts = label.split("_", 1)
            return parts[0], parts[1] if len(parts) > 1 else parts[0]
        return label, label
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        """Apply softmax to logits."""
        exp_x = np.exp(x - np.max(x))
        return exp_x / exp_x.sum()
    
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
