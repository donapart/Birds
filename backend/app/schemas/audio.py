"""
Pydantic schemas for audio-related requests and responses.
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, validator
import base64


class AudioFormat(str, Enum):
    """Supported audio formats."""
    PCM16_LE = "pcm16_le"  # 16-bit PCM little-endian
    PCM16_BE = "pcm16_be"  # 16-bit PCM big-endian
    FLOAT32 = "float32"    # 32-bit float
    OGG_OPUS = "ogg_opus"  # Ogg Opus compressed
    WAV = "wav"            # WAV file
    MP3 = "mp3"            # MP3 (not recommended for analysis)


class AudioChunkRequest(BaseModel):
    """
    Request schema for audio analysis.
    Sent from mobile app to backend.
    """
    device_id: str = Field(
        ...,
        description="Unique identifier for the device",
        example="android-abc123"
    )
    timestamp_utc: datetime = Field(
        ...,
        description="UTC timestamp when recording was captured",
        example="2025-11-29T11:23:45Z"
    )

    # Location (optional but recommended)
    latitude: Optional[float] = Field(
        None,
        ge=-90,
        le=90,
        description="GPS latitude",
        example=52.52
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180,
        le=180,
        description="GPS longitude",
        example=13.405
    )
    altitude_m: Optional[float] = Field(
        None,
        description="Altitude in meters",
        example=34.5
    )

    # Audio data
    sample_rate: int = Field(
        ...,
        ge=8000,
        le=96000,
        description="Sample rate in Hz",
        example=16000
    )
    audio_format: AudioFormat = Field(
        ...,
        description="Format of the audio data",
        example="pcm16_le"
    )
    audio_base64: str = Field(
        ...,
        description="Base64-encoded audio data",
        min_length=100
    )

    # Optional processing hints
    models: Optional[List[str]] = Field(
        None,
        description="Specific models to use (None = all available)",
        example=["birdnet", "huggingface"]
    )
    min_confidence: Optional[float] = Field(
        None,
        ge=0,
        le=1,
        description="Minimum confidence threshold",
        example=0.1
    )

    # Additional metadata
    metadata: Optional[dict] = Field(
        None,
        description="Additional metadata from device"
    )

    @validator("audio_base64")
    def validate_base64(cls, v):
        """Validate that audio_base64 is valid base64."""
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError("Invalid base64 encoding")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "device_id": "android-pixel7-abc123",
                "timestamp_utc": "2025-11-29T11:23:45Z",
                "latitude": 52.52,
                "longitude": 13.405,
                "sample_rate": 16000,
                "audio_format": "pcm16_le",
                "audio_base64": "UklGRiQAAABXQVZFZm10...",
                "models": ["birdnet", "huggingface"],
                "min_confidence": 0.1
            }
        }


class AudioChunkBatchRequest(BaseModel):
    """Batch request for multiple audio chunks."""
    chunks: List[AudioChunkRequest] = Field(
        ...,
        max_length=10,
        description="List of audio chunks to process"
    )
