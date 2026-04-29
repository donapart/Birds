"""
Application configuration using Pydantic Settings.
"""
import logging
from functools import lru_cache
from typing import List, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_INSECURE_API_KEY_DEFAULTS = {"changeme-in-production", "changeme", ""}


def _read_version() -> str:
    """Read application version from a single source-of-truth VERSION file.

    Falls back to a hard-coded value if the file is missing (e.g. in tests).
    """
    from pathlib import Path

    candidates = [
        Path(__file__).resolve().parents[2] / "VERSION",  # backend/VERSION
        Path(__file__).resolve().parents[3] / "VERSION",  # repo root
    ]
    for path in candidates:
        try:
            if path.is_file():
                return path.read_text(encoding="utf-8").strip() or "0.0.0"
        except OSError:
            continue
    return "0.0.0"


_APP_VERSION = _read_version()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "BirdSound API"
    APP_VERSION: str = _APP_VERSION
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

    # CORS - in production, set explicit origins (comma-separated env var CORS_ORIGINS)
    CORS_ORIGINS: List[str] = ["*"]

    # API Security - MUST be overridden via env var API_KEYS in production
    API_KEYS: List[str] = ["changeme-in-production"]  # Comma-separated keys

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    @model_validator(mode="after")
    def _validate_security(self) -> "Settings":
        """Reject insecure defaults when not running in DEBUG mode."""
        insecure_keys = [k for k in self.API_KEYS if k.strip().lower() in _INSECURE_API_KEY_DEFAULTS]
        wildcard_with_credentials = "*" in self.CORS_ORIGINS

        if self.DEBUG:
            if insecure_keys:
                logger.warning(
                    "Using insecure default API key(s) in DEBUG mode. Set API_KEYS env var before deploying."
                )
            if wildcard_with_credentials:
                logger.warning(
                    "CORS_ORIGINS='*' in DEBUG mode. Restrict to explicit origins before deploying."
                )
            return self

        problems: List[str] = []
        if insecure_keys:
            problems.append(
                "API_KEYS contains insecure default values; set the API_KEYS env var to a list of secrets."
            )
        if wildcard_with_credentials:
            problems.append(
                "CORS_ORIGINS='*' is not allowed in production; set explicit origins via the CORS_ORIGINS env var."
            )
        if problems:
            raise ValueError(
                "Insecure configuration detected (set DEBUG=true to bypass for local dev):\n - "
                + "\n - ".join(problems)
            )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
