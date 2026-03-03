"""
BirdNET model stub implementation.

This is a lightweight stub that simulates BirdNET predictions for testing
and development. For production use, see birdnet_runtime.py or birdnet_official.py.
"""
import logging
import time
import random
from typing import Optional, List
import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult

logger = logging.getLogger(__name__)


# Sample European bird species for stub predictions
SAMPLE_SPECIES = [
    ("Amsel", "Turdus merula"),
    ("Kohlmeise", "Parus major"),
    ("Blaumeise", "Cyanistes caeruleus"),
    ("Rotkehlchen", "Erithacus rubecula"),
    ("Buchfink", "Fringilla coelebs"),
    ("Haussperling", "Passer domesticus"),
    ("Star", "Sturnus vulgaris"),
    ("Ringeltaube", "Columba palumbus"),
    ("Elster", "Pica pica"),
    ("Zaunkönig", "Troglodytes troglodytes"),
    ("Grünfink", "Chloris chloris"),
    ("Goldammer", "Emberiza citrinella"),
    ("Zilpzalp", "Phylloscopus collybita"),
    ("Mönchsgrasmücke", "Sylvia atricapilla"),
    ("Nachtigall", "Luscinia megarhynchos"),
    ("Singdrossel", "Turdus philomelos"),
    ("Kleiber", "Sitta europaea"),
    ("Buntspecht", "Dendrocopos major"),
    ("Eichelhäher", "Garrulus glandarius"),
    ("Kuckuck", "Cuculus canorus"),
]


class BirdNETModel(BaseBirdModel):
    """
    BirdNET model stub for development and testing.
    
    This stub returns simulated predictions based on audio characteristics.
    Replace with BirdNETRuntimeModel or BirdNETOfficialModel for production.
    """
    
    def __init__(
        self,
        top_n: int = 5,
        min_confidence: float = 0.1,
        model_path: Optional[str] = None,
        labels_path: Optional[str] = None,
    ):
        """
        Initialize BirdNET stub model.
        
        Args:
            top_n: Number of top predictions to return
            min_confidence: Minimum confidence threshold
            model_path: Path to model file (ignored in stub)
            labels_path: Path to labels file (ignored in stub)
        """
        super().__init__(
            name="BirdNET",
            version="2.4-stub",
            top_n=top_n,
            min_confidence=min_confidence,
        )
        self.model_path = model_path
        self.labels_path = labels_path
    
    async def load(self) -> None:
        """Load the model (stub: immediate success)."""
        logger.info(f"Loading {self.name} stub model...")
        # Simulate loading time
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
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        date: Optional[str] = None,
        **kwargs
    ) -> ModelOutput:
        """
        Generate stub predictions based on audio data.
        
        Args:
            audio_data: Audio samples as numpy array
            sample_rate: Sample rate of the audio
            latitude: Optional latitude for location filtering
            longitude: Optional longitude for location filtering
            date: Optional date string for seasonal filtering
            
        Returns:
            ModelOutput with simulated predictions
        """
        if not self._loaded:
            raise RuntimeError(f"{self.name} model not loaded")
        
        start_time = time.time()
        
        # Generate pseudo-random but deterministic predictions based on audio
        predictions = self._generate_stub_predictions(audio_data)
        
        processing_time = (time.time() - start_time) * 1000
        
        return ModelOutput(
            model_name=self.name,
            model_version=self.version,
            predictions=predictions,
            processing_time_ms=processing_time,
            metadata={
                "stub": True,
                "sample_rate": sample_rate,
                "audio_duration_sec": len(audio_data) / sample_rate,
                "location": {"lat": latitude, "lon": longitude} if latitude else None,
            }
        )
    
    def _generate_stub_predictions(self, audio_data: np.ndarray) -> List[PredictionResult]:
        """Generate deterministic stub predictions based on audio characteristics."""
        # Use audio energy to seed random selection (deterministic)
        energy = float(np.mean(np.abs(audio_data)))
        seed = int(energy * 10000) % 1000
        rng = random.Random(seed)
        
        # Select random species
        selected = rng.sample(SAMPLE_SPECIES, min(self.top_n, len(SAMPLE_SPECIES)))
        
        # Generate decreasing confidence scores
        predictions = []
        for i, (common_name, scientific_name) in enumerate(selected):
            # Generate confidence that decreases with rank
            base_conf = 0.95 - (i * 0.15)
            conf = max(self.min_confidence, base_conf + rng.uniform(-0.1, 0.1))
            
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
