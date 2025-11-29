"""
Pydantic schemas for prediction responses.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class SpeciesPrediction(BaseModel):
    """Single species prediction from a model."""
    species_code: Optional[str] = Field(
        None,
        description="Species code (e.g., 'turdus_merula')"
    )
    species_scientific: Optional[str] = Field(
        None,
        description="Scientific name",
        example="Turdus merula"
    )
    species_common: str = Field(
        ...,
        description="Common name",
        example="Eurasian Blackbird"
    )
    confidence: float = Field(
        ...,
        ge=0,
        le=1,
        description="Confidence score (0-1)",
        example=0.92
    )
    rank: int = Field(
        ...,
        ge=1,
        description="Rank among predictions (1 = top)",
        example=1
    )


class ModelPrediction(BaseModel):
    """Predictions from a single model."""
    model_name: str = Field(
        ...,
        description="Name of the ML model",
        example="birdnet_v2.4"
    )
    model_version: Optional[str] = Field(
        None,
        description="Model version",
        example="2.4"
    )
    inference_time_ms: int = Field(
        ...,
        description="Time taken for inference in milliseconds",
        example=45
    )
    predictions: List[SpeciesPrediction] = Field(
        ...,
        description="List of species predictions"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "birdnet_v2.4",
                "model_version": "2.4",
                "inference_time_ms": 45,
                "predictions": [
                    {
                        "species_code": "turdus_merula",
                        "species_scientific": "Turdus merula",
                        "species_common": "Eurasian Blackbird",
                        "confidence": 0.92,
                        "rank": 1
                    },
                    {
                        "species_code": "erithacus_rubecula",
                        "species_scientific": "Erithacus rubecula",
                        "species_common": "European Robin",
                        "confidence": 0.05,
                        "rank": 2
                    }
                ]
            }
        }


class ConsensusPrediction(BaseModel):
    """Consensus prediction combining all models."""
    species_code: Optional[str] = None
    species_scientific: Optional[str] = None
    species_common: str = Field(
        ...,
        description="Best guess species name"
    )
    confidence: float = Field(
        ...,
        description="Combined confidence score"
    )
    method: str = Field(
        ...,
        description="Consensus method used",
        example="weighted_average"
    )
    agreement_count: int = Field(
        ...,
        description="Number of models agreeing on this species"
    )
    total_models: int = Field(
        ...,
        description="Total number of models used"
    )


class PredictionResponse(BaseModel):
    """
    Full prediction response returned to mobile app.
    Contains predictions from all models plus consensus.
    """
    recording_id: UUID = Field(
        ...,
        description="Unique identifier for this recording"
    )
    timestamp_utc: datetime = Field(
        ...,
        description="When the recording was made"
    )
    processing_time_ms: int = Field(
        ...,
        description="Total processing time"
    )

    # Per-model predictions
    model_predictions: List[ModelPrediction] = Field(
        ...,
        description="Predictions from each model"
    )

    # Consensus result
    consensus: ConsensusPrediction = Field(
        ...,
        description="Combined prediction across all models"
    )

    # Location (echoed back for confirmation)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        json_schema_extra = {
            "example": {
                "recording_id": "550e8400-e29b-41d4-a716-446655440000",
                "timestamp_utc": "2025-11-29T11:23:45Z",
                "processing_time_ms": 150,
                "latitude": 52.52,
                "longitude": 13.405,
                "model_predictions": [
                    {
                        "model_name": "birdnet_v2.4",
                        "inference_time_ms": 45,
                        "predictions": [
                            {
                                "species_common": "Eurasian Blackbird",
                                "confidence": 0.92,
                                "rank": 1
                            }
                        ]
                    },
                    {
                        "model_name": "huggingface_wav2vec2",
                        "inference_time_ms": 85,
                        "predictions": [
                            {
                                "species_common": "Eurasian Blackbird",
                                "confidence": 0.88,
                                "rank": 1
                            }
                        ]
                    }
                ],
                "consensus": {
                    "species_common": "Eurasian Blackbird",
                    "confidence": 0.90,
                    "method": "weighted_average",
                    "agreement_count": 2,
                    "total_models": 2
                }
            }
        }


class BatchPredictionResponse(BaseModel):
    """Response for batch prediction requests."""
    predictions: List[PredictionResponse]
    total_processing_time_ms: int


class RecordingListItem(BaseModel):
    """Summary of a recording for list views."""
    id: UUID
    timestamp_utc: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    consensus_species: Optional[str]
    consensus_confidence: Optional[float]
    model_count: int


class RecordingDetail(BaseModel):
    """Detailed recording information."""
    id: UUID
    device_id: str
    timestamp_utc: datetime
    latitude: Optional[float]
    longitude: Optional[float]
    duration_sec: float
    sample_rate: int

    consensus_species: Optional[str]
    consensus_confidence: Optional[float]
    consensus_method: Optional[str]

    predictions: List[ModelPrediction]
    metadata: Optional[Dict[str, Any]]


class MapDataPoint(BaseModel):
    """Data point for map visualization."""
    id: UUID
    lat: float
    lon: float
    species: str
    confidence: float
    timestamp: datetime


class TimelineEntry(BaseModel):
    """Entry for timeline visualization."""
    timestamp: datetime
    species: str
    confidence: float
    models_agreed: int
    latitude: Optional[float]
    longitude: Optional[float]


class ModelComparisonEntry(BaseModel):
    """Entry for model comparison analysis."""
    recording_id: UUID
    timestamp: datetime
    model_predictions: Dict[str, str]  # model_name -> species
    model_confidences: Dict[str, float]  # model_name -> confidence
    consensus: str
    all_agree: bool
