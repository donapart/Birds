"""
HuggingFace model stub implementations.

These are lightweight stubs that simulate HuggingFace model predictions for
testing and development. For production use, see hf_runtime.py.
"""
import logging
import time
import random
from typing import Optional, List
import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


# DimaBird European species (subset)
DIMABIRD_SPECIES = [
    ("European Robin", "Erithacus rubecula"),
    ("Common Blackbird", "Turdus merula"),
    ("Great Tit", "Parus major"),
    ("Blue Tit", "Cyanistes caeruleus"),
    ("Common Chaffinch", "Fringilla coelebs"),
    ("House Sparrow", "Passer domesticus"),
    ("Eurasian Wren", "Troglodytes troglodytes"),
    ("Song Thrush", "Turdus philomelos"),
    ("Eurasian Blackcap", "Sylvia atricapilla"),
    ("Common Nightingale", "Luscinia megarhynchos"),
    ("European Greenfinch", "Chloris chloris"),
    ("Yellowhammer", "Emberiza citrinella"),
    ("Common Chiffchaff", "Phylloscopus collybita"),
    ("Willow Warbler", "Phylloscopus trochilus"),
    ("Eurasian Nuthatch", "Sitta europaea"),
    ("Great Spotted Woodpecker", "Dendrocopos major"),
    ("Eurasian Jay", "Garrulus glandarius"),
    ("Common Cuckoo", "Cuculus canorus"),
    ("Common Starling", "Sturnus vulgaris"),
    ("Wood Pigeon", "Columba palumbus"),
]


class HuggingFaceModel(BaseBirdModel):
    """
    Generic HuggingFace model stub for development and testing.
    
    This stub returns simulated predictions. Replace with real HuggingFace
    implementation for production use.
    """
    
    def __init__(
        self,
        model_name_or_path: str = "generic/bird-classifier",
        top_n: int = 5,
        min_confidence: float = 0.1,
        sample_rate: int = 16000,
    ):
        """
        Initialize HuggingFace model stub.
        
        Args:
            model_name_or_path: HuggingFace model identifier or path
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
            sample_rate: Expected sample rate for audio
        """
        super().__init__(
            name="HuggingFace",
            version=model_name_or_path,
            top_n=top_n,
            min_confidence=min_confidence,
        )
        self.model_name_or_path = model_name_or_path
        self.sample_rate = sample_rate
        self.species_list = DIMABIRD_SPECIES
    
    async def load(self) -> None:
        """Load the model (stub: immediate success)."""
        logger.info(f"Loading {self.name} stub model ({self.model_name_or_path})...")
        await self._simulate_delay(0.1)
        self._loaded = True
        logger.info(f"{self.name} stub model loaded successfully")
    
    async def unload(self) -> None:
        """Unload the model."""
        logger.info(f"Unloading {self.name} stub model...")
        self._loaded = False
    
    async def predict(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        **kwargs
    ) -> ModelOutput:
        """
        Generate stub predictions.
        
        Args:
            audio_data: Audio samples as numpy array
            sample_rate: Sample rate of the audio
            
        Returns:
            ModelOutput with simulated predictions
        """
        if not self._loaded:
            raise RuntimeError(f"{self.name} model not loaded")
        
        start_time = time.time()
        
        predictions = self._generate_stub_predictions(audio_data)
        
        processing_time = (time.time() - start_time) * 1000
        
        return ModelOutput(
            model_name=self.name,
            model_version=self.version,
            predictions=predictions,
            processing_time_ms=processing_time,
            metadata={
                "stub": True,
                "model_path": self.model_name_or_path,
                "sample_rate": sample_rate,
                "audio_duration_sec": len(audio_data) / sample_rate,
            }
        )
    
    def _generate_stub_predictions(self, audio_data: np.ndarray) -> List[PredictionResult]:
        """Generate deterministic stub predictions."""
        # Use different seed than BirdNET for variety
        energy = float(np.std(audio_data))
        seed = int(energy * 10000) % 1000 + 500
        rng = random.Random(seed)
        
        selected = rng.sample(self.species_list, min(self.top_n, len(self.species_list)))
        
        predictions = []
        for i, (common_name, scientific_name) in enumerate(selected):
            base_conf = 0.90 - (i * 0.12)
            conf = max(self.min_confidence, base_conf + rng.uniform(-0.08, 0.08))
            
            if conf >= self.min_confidence:
                predictions.append(PredictionResult(
                    species=common_name,
                    scientific_name=scientific_name,
                    confidence=round(conf, 4),
                    rank=i + 1,
                ))
        
        return predictions
    
    async def _simulate_delay(self, seconds: float) -> None:
        """Simulate async delay."""
        import asyncio
        await asyncio.sleep(seconds)


class DimaBirdModel(HuggingFaceModel):
    """
    DimaBird model stub - specialized for European bird species.
    
    Based on dima806/bird_sounds_classification from HuggingFace.
    """
    
    def __init__(
        self,
        top_n: int = 5,
        min_confidence: float = 0.1,
        sample_rate: int = 16000,
    ):
        """
        Initialize DimaBird model stub.
        
        Args:
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
            sample_rate: Expected sample rate for audio
        """
        super().__init__(
            model_name_or_path="dima806/bird_sounds_classification",
            top_n=top_n,
            min_confidence=min_confidence,
            sample_rate=sample_rate,
        )
        self.name = "DimaBird"
        self.version = "dima806/bird_sounds_classification-stub"
