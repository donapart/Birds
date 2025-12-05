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
    APP_VERSION: str = "5.4.0"
    DEBUG: bool = False

    # ML Model loading
    # When True, the application will load lightweight stub models instead
    # of the full heavy ML stacks (ONNX Runtime, Transformers, Torch, etc.).
    # This is intended for tests and local development where correctness of
    # the surrounding pipeline matters more than model accuracy.
    USE_MODEL_STUBS: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/birdsound"
    USE_SQLITE: bool = False  # Fallback to SQLite if PostgreSQL unavailable
    SQLITE_PATH: str = "birdsound.db"

    # Audio Processing
    AUDIO_SAMPLE_RATE: int = 48000  # BirdNET expects 48kHz
    AUDIO_WINDOW_SIZE_SEC: float = 3.0  # 3 second windows
    AUDIO_HOP_SIZE_SEC: float = 1.0  # 1 second hop (overlap)

    # Model Configuration
    BIRDNET_MODEL_PATH: Optional[str] = "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx"
    BIRDNET_LABELS_PATH: Optional[str] = "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt"
    HF_MODEL_NAME: str = "dima806/bird_sounds_classification"
    
    # Google Perch Model (15,000 species)
    ENABLE_PERCH_MODEL: bool = True  # Set True to enable Perch
    PERCH_MODEL_PATH: Optional[str] = "models/perch"  # Path to TensorFlow SavedModel
    
    # Xeno-canto Integration
    ENABLE_XENO_CANTO: bool = True  # Enable reference recordings lookup

    # Prediction Settings
    MIN_CONFIDENCE_THRESHOLD: float = 0.1
    TOP_N_PREDICTIONS: int = 5

    # Geographic Filtering (optional - for BirdNET)
    DEFAULT_LAT: Optional[float] = 52.52  # Berlin
    DEFAULT_LON: Optional[float] = 13.405

    # Storage
    STORAGE_TYPE: str = "local"  # "local" or "s3"
    AUDIO_STORAGE_PATH: str = "audio_storage"
    S3_BUCKET: Optional[str] = None
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"

    # Redis / Cache
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 3600

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # API Security
    API_KEYS: List[str] = ["changeme-in-production"]  # Comma-separated keys

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
