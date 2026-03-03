"""
Base class and data structures for bird sound classification models.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import numpy as np


@dataclass
class PredictionResult:
    """Single prediction result from a model."""
    species: str
    scientific_name: Optional[str] = None
    confidence: float = 0.0
    rank: int = 0
    
    @property
    def species_common(self) -> str:
        """Alias for species (common name)."""
        return self.species
    
    @property
    def species_code(self) -> Optional[str]:
        """Species code (derived from scientific name if available)."""
        if self.scientific_name:
            return self.scientific_name.replace(' ', '_').lower()
        return None
    
    @property
    def species_scientific(self) -> Optional[str]:
        """Alias for scientific_name."""
        return self.scientific_name
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "species": self.species,
            "species_common": self.species,
            "scientific_name": self.scientific_name,
            "species_scientific": self.scientific_name,
            "confidence": self.confidence,
            "rank": self.rank,
        }


@dataclass
class ModelOutput:
    """Output from a model prediction."""
    model_name: str
    model_version: str
    predictions: List[PredictionResult] = field(default_factory=list)
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model_name": self.model_name,
            "model_version": self.model_version,
            "predictions": [p.to_dict() for p in self.predictions],
            "processing_time_ms": self.processing_time_ms,
            "metadata": self.metadata,
        }
    
    @property
    def top_prediction(self) -> Optional[PredictionResult]:
        """Get the top prediction if available."""
        return self.predictions[0] if self.predictions else None


class BaseBirdModel(ABC):
    """
    Abstract base class for bird sound classification models.
    
    All model implementations should inherit from this class and implement
    the required abstract methods.
    """
    
    def __init__(
        self,
        name: str = "BaseModel",
        version: str = "1.0.0",
        top_n: int = 5,
        min_confidence: float = 0.1,
    ):
        """
        Initialize the base model.
        
        Args:
            name: Model name for identification
            version: Model version string
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold for predictions
        """
        self.name = name
        self.version = version
        self.top_n = top_n
        self.min_confidence = min_confidence
        self._loaded = False
    
    @property
    def model_name(self) -> str:
        """Alias for name - for backwards compatibility."""
        return self.name
    
    @property
    def is_loaded(self) -> bool:
        """Check if the model is loaded and ready for inference."""
        return self._loaded
    
    @abstractmethod
    async def load(self) -> None:
        """
        Load the model weights and prepare for inference.
        
        Should set self._loaded = True when successful.
        """
        pass
    
    @abstractmethod
    async def unload(self) -> None:
        """
        Unload the model and free resources.
        
        Should set self._loaded = False.
        """
        pass
    
    @abstractmethod
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
            **kwargs: Additional model-specific parameters
            
        Returns:
            ModelOutput with predictions
        """
        pass
    
    def get_info(self) -> Dict[str, Any]:
        """Get model information."""
        return {
            "name": self.name,
            "version": self.version,
            "type": self.__class__.__name__,
            "status": "loaded" if self._loaded else "not_loaded",
            "top_n": self.top_n,
            "min_confidence": self.min_confidence,
        }
