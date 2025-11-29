"""
SQLAlchemy ORM models for BirdSound database.

Tables:
- recordings: Raw audio recording metadata
- predictions: ML model predictions per recording
- species: Species lookup table (optional, for normalization)
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.database import Base


class Recording(Base):
    """
    Represents a single audio recording/window sent for analysis.
    """
    __tablename__ = "recordings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    device_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    timestamp_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    # Location (simple lat/lon - PostGIS POINT can be added later)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    altitude_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Audio metadata
    duration_sec: Mapped[float] = mapped_column(Float, nullable=False)
    sample_rate: Mapped[int] = mapped_column(Integer, nullable=False)
    audio_format: Mapped[str] = mapped_column(String(50), nullable=False)

    # Storage reference (path to stored audio file, if persisted)
    audio_storage_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Processing metadata
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Consensus result (best guess across all models)
    consensus_species: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    consensus_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    consensus_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Additional metadata
    extra_metadata: Mapped[Optional[dict]] = mapped_column(
        "metadata", JSON, nullable=True
    )

    # Relationships
    predictions: Mapped[List["Prediction"]] = relationship(
        "Prediction",
        back_populates="recording",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_recordings_location", "latitude", "longitude"),
        Index("ix_recordings_device_time", "device_id", "timestamp_utc"),
    )

    def __repr__(self):
        return f"<Recording {self.id} @ {self.timestamp_utc}>"


class Prediction(Base):
    """
    Represents a single prediction from one ML model for a recording.
    """
    __tablename__ = "predictions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    recording_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recordings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Model information
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Prediction result
    species_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    species_scientific: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    species_common: Mapped[str] = mapped_column(String(255), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Ranking (1 = top prediction for this model)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Timing
    inference_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Raw model output (for debugging/analysis)
    raw_output: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationship
    recording: Mapped["Recording"] = relationship("Recording", back_populates="predictions")

    __table_args__ = (
        Index("ix_predictions_model_species", "model_name", "species_common"),
        Index("ix_predictions_confidence", "confidence"),
    )

    def __repr__(self):
        return f"<Prediction {self.model_name}: {self.species_common} ({self.confidence:.2f})>"


class Species(Base):
    """
    Species lookup table for normalization and metadata.
    """
    __tablename__ = "species"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identifiers
    species_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    scientific_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    common_name_en: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    common_name_de: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Taxonomy
    family: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Geographic range (simplified)
    native_to_europe: Mapped[bool] = mapped_column(Boolean, default=False)
    native_to_germany: Mapped[bool] = mapped_column(Boolean, default=False)

    # BirdNET specific
    birdnet_label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Additional info
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    wikipedia_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    xeno_canto_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self):
        return f"<Species {self.species_code}: {self.common_name_en}>"


class ModelPerformance(Base):
    """
    Track model performance metrics over time.
    """
    __tablename__ = "model_performance"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Metrics
    total_predictions: Mapped[int] = mapped_column(Integer, default=0)
    avg_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_inference_time_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Agreement with consensus
    consensus_agreement_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Top species predicted
    top_species: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_model_perf_model_date", "model_name", "date"),
    )
