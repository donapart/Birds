"""
Recordings API endpoints for querying stored predictions.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.schemas.prediction import (
    RecordingListItem,
    RecordingDetail,
    MapDataPoint,
    TimelineEntry,
    ModelComparisonEntry,
    ModelPrediction,
    SpeciesPrediction,
)
from app.db.database import get_db
from app.db.models import Recording, Prediction

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/recordings", response_model=List[RecordingListItem])
async def list_recordings(
    device_id: Optional[str] = None,
    species: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_confidence: float = Query(0.0, ge=0, le=1),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    List recordings with optional filters.

    Filters:
    - device_id: Filter by device
    - species: Filter by consensus species name
    - start_date/end_date: Date range
    - min_confidence: Minimum consensus confidence
    """
    query = select(Recording).order_by(Recording.timestamp_utc.desc())

    # Apply filters
    conditions = []
    if device_id:
        conditions.append(Recording.device_id == device_id)
    if species:
        conditions.append(Recording.consensus_species.ilike(f"%{species}%"))
    if start_date:
        conditions.append(Recording.timestamp_utc >= start_date)
    if end_date:
        conditions.append(Recording.timestamp_utc <= end_date)
    if min_confidence > 0:
        conditions.append(Recording.consensus_confidence >= min_confidence)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    recordings = result.scalars().all()

    # Count predictions per recording
    items = []
    for rec in recordings:
        # Get model count
        pred_count_query = select(func.count(func.distinct(Prediction.model_name))).where(
            Prediction.recording_id == rec.id
        )
        count_result = await db.execute(pred_count_query)
        model_count = count_result.scalar() or 0

        items.append(RecordingListItem(
            id=rec.id,
            timestamp_utc=rec.timestamp_utc,
            latitude=rec.latitude,
            longitude=rec.longitude,
            consensus_species=rec.consensus_species,
            consensus_confidence=rec.consensus_confidence,
            model_count=model_count
        ))

    return items


@router.get("/recordings/{recording_id}", response_model=RecordingDetail)
async def get_recording(
    recording_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific recording."""
    query = (
        select(Recording)
        .options(selectinload(Recording.predictions))
        .where(Recording.id == recording_id)
    )

    result = await db.execute(query)
    recording = result.scalar_one_or_none()

    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Group predictions by model
    models_dict = {}
    for pred in recording.predictions:
        if pred.model_name not in models_dict:
            models_dict[pred.model_name] = {
                "model_name": pred.model_name,
                "model_version": pred.model_version,
                "inference_time_ms": pred.inference_time_ms or 0,
                "predictions": []
            }

        models_dict[pred.model_name]["predictions"].append(
            SpeciesPrediction(
                species_code=pred.species_code,
                species_scientific=pred.species_scientific,
                species_common=pred.species_common,
                confidence=pred.confidence,
                rank=pred.rank
            )
        )

    # Sort predictions within each model by rank
    model_predictions = []
    for model_data in models_dict.values():
        model_data["predictions"].sort(key=lambda x: x.rank)
        model_predictions.append(ModelPrediction(**model_data))

    return RecordingDetail(
        id=recording.id,
        device_id=recording.device_id,
        timestamp_utc=recording.timestamp_utc,
        latitude=recording.latitude,
        longitude=recording.longitude,
        duration_sec=recording.duration_sec,
        sample_rate=recording.sample_rate,
        consensus_species=recording.consensus_species,
        consensus_confidence=recording.consensus_confidence,
        consensus_method=recording.consensus_method,
        predictions=model_predictions,
        metadata=recording.metadata
    )


@router.get("/recordings/map/points", response_model=List[MapDataPoint])
async def get_map_data(
    species: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_confidence: float = Query(0.5, ge=0, le=1),
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db)
):
    """
    Get data points for map visualization.

    Returns recording locations with species and confidence.
    Only returns recordings with valid coordinates.
    """
    query = (
        select(Recording)
        .where(
            and_(
                Recording.latitude.isnot(None),
                Recording.longitude.isnot(None),
                Recording.consensus_species.isnot(None),
                Recording.consensus_confidence >= min_confidence
            )
        )
        .order_by(Recording.timestamp_utc.desc())
        .limit(limit)
    )

    if species:
        query = query.where(Recording.consensus_species.ilike(f"%{species}%"))
    if start_date:
        query = query.where(Recording.timestamp_utc >= start_date)
    if end_date:
        query = query.where(Recording.timestamp_utc <= end_date)

    result = await db.execute(query)
    recordings = result.scalars().all()

    return [
        MapDataPoint(
            id=rec.id,
            lat=rec.latitude,
            lon=rec.longitude,
            species=rec.consensus_species,
            confidence=rec.consensus_confidence,
            timestamp=rec.timestamp_utc
        )
        for rec in recordings
    ]


@router.get("/recordings/timeline", response_model=List[TimelineEntry])
async def get_timeline(
    device_id: Optional[str] = None,
    hours: int = Query(24, ge=1, le=168),
    min_confidence: float = Query(0.3, ge=0, le=1),
    db: AsyncSession = Depends(get_db)
):
    """
    Get timeline of detections for the past N hours.

    Useful for "what's been singing recently" view.
    """
    since = datetime.utcnow() - timedelta(hours=hours)

    query = (
        select(Recording)
        .where(
            and_(
                Recording.timestamp_utc >= since,
                Recording.consensus_species.isnot(None),
                Recording.consensus_confidence >= min_confidence
            )
        )
        .order_by(Recording.timestamp_utc.desc())
    )

    if device_id:
        query = query.where(Recording.device_id == device_id)

    result = await db.execute(query)
    recordings = result.scalars().all()

    # For each recording, count agreeing models
    timeline = []
    for rec in recordings:
        # Count models that agreed on consensus
        agree_query = (
            select(func.count(func.distinct(Prediction.model_name)))
            .where(
                and_(
                    Prediction.recording_id == rec.id,
                    Prediction.species_common == rec.consensus_species,
                    Prediction.rank == 1
                )
            )
        )
        agree_result = await db.execute(agree_query)
        models_agreed = agree_result.scalar() or 0

        timeline.append(TimelineEntry(
            timestamp=rec.timestamp_utc,
            species=rec.consensus_species,
            confidence=rec.consensus_confidence,
            models_agreed=models_agreed,
            latitude=rec.latitude,
            longitude=rec.longitude
        ))

    return timeline


@router.get("/recordings/stats")
async def get_statistics(
    device_id: Optional[str] = None,
    days: int = Query(7, ge=1, le=365),
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about recordings and detections.
    """
    since = datetime.utcnow() - timedelta(days=days)

    # Base condition
    conditions = [Recording.timestamp_utc >= since]
    if device_id:
        conditions.append(Recording.device_id == device_id)

    # Total recordings
    total_query = select(func.count()).select_from(Recording).where(and_(*conditions))
    total_result = await db.execute(total_query)
    total_recordings = total_result.scalar()

    # Recordings with detections
    with_detection = conditions + [Recording.consensus_species.isnot(None)]
    detection_query = select(func.count()).select_from(Recording).where(and_(*with_detection))
    detection_result = await db.execute(detection_query)
    recordings_with_detection = detection_result.scalar()

    # Unique species
    species_query = (
        select(func.count(func.distinct(Recording.consensus_species)))
        .where(and_(*with_detection))
    )
    species_result = await db.execute(species_query)
    unique_species = species_result.scalar()

    # Top species
    top_species_query = (
        select(Recording.consensus_species, func.count().label("count"))
        .where(and_(*with_detection))
        .group_by(Recording.consensus_species)
        .order_by(func.count().desc())
        .limit(10)
    )
    top_result = await db.execute(top_species_query)
    top_species = [{"species": row[0], "count": row[1]} for row in top_result.all()]

    return {
        "period_days": days,
        "total_recordings": total_recordings,
        "recordings_with_detection": recordings_with_detection,
        "unique_species": unique_species,
        "top_species": top_species
    }


@router.get("/recordings/compare", response_model=List[ModelComparisonEntry])
async def compare_models(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    disagreements_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """
    Compare predictions across models.

    Useful for analyzing where models agree/disagree.
    Set disagreements_only=True to only see recordings where models disagree.
    """
    query = (
        select(Recording)
        .options(selectinload(Recording.predictions))
        .order_by(Recording.timestamp_utc.desc())
        .limit(limit * 2)  # Fetch more since we'll filter
    )

    if start_date:
        query = query.where(Recording.timestamp_utc >= start_date)
    if end_date:
        query = query.where(Recording.timestamp_utc <= end_date)

    result = await db.execute(query)
    recordings = result.scalars().all()

    comparisons = []
    for rec in recordings:
        if len(comparisons) >= limit:
            break

        # Get top-1 prediction from each model
        model_preds = {}
        model_confs = {}

        for pred in rec.predictions:
            if pred.rank == 1:
                model_preds[pred.model_name] = pred.species_common
                model_confs[pred.model_name] = pred.confidence

        if not model_preds:
            continue

        # Check if all models agree
        unique_predictions = set(model_preds.values())
        all_agree = len(unique_predictions) == 1

        if disagreements_only and all_agree:
            continue

        comparisons.append(ModelComparisonEntry(
            recording_id=rec.id,
            timestamp=rec.timestamp_utc,
            model_predictions=model_preds,
            model_confidences=model_confs,
            consensus=rec.consensus_species or "Unknown",
            all_agree=all_agree
        ))

    return comparisons
