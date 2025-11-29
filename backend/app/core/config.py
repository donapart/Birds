"""
Application configuration using Pydantic Settings.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "BirdSound API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/birdsound"

    # Audio Processing
    AUDIO_SAMPLE_RATE: int = 48000  # BirdNET expects 48kHz
    AUDIO_WINDOW_SIZE_SEC: float = 3.0  # 3 second windows
    AUDIO_HOP_SIZE_SEC: float = 1.0  # 1 second hop (overlap)

    # Model Configuration
    BIRDNET_MODEL_PATH: Optional[str] = "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx"
    BIRDNET_LABELS_PATH: Optional[str] = "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt"
    HF_MODEL_NAME: str = "dima806/bird_sounds_classification"

    # Prediction Settings
    MIN_CONFIDENCE_THRESHOLD: float = 0.1
    TOP_N_PREDICTIONS: int = 5

    # Geographic Filtering (optional - for BirdNET)
    DEFAULT_LAT: Optional[float] = 52.52  # Berlin
    DEFAULT_LON: Optional[float] = 13.405

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
