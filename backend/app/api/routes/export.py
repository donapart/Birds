"""
Export API endpoints for downloading detection data.

Supports:
- CSV export
- JSON export
- GeoJSON export (for mapping applications)
"""
import csv
import io
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.db.models import Recording, Prediction

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/export/csv")
async def export_csv(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    species: Optional[str] = None,
    min_confidence: float = Query(0.0, ge=0, le=1),
    include_predictions: bool = Query(False, description="Include per-model predictions"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export recordings as CSV file.

    Returns a downloadable CSV with columns:
    - recording_id, timestamp, device_id, latitude, longitude
    - consensus_species, consensus_confidence
    - Optionally: per-model predictions
    """
    query = select(Recording).order_by(Recording.timestamp_utc.desc())

    # Apply filters
    conditions = []
    if start_date:
        conditions.append(Recording.timestamp_utc >= start_date)
    if end_date:
        conditions.append(Recording.timestamp_utc <= end_date)
    if device_id:
        conditions.append(Recording.device_id == device_id)
    if species:
        conditions.append(Recording.consensus_species.ilike(f"%{species}%"))
    if min_confidence > 0:
        conditions.append(Recording.consensus_confidence >= min_confidence)

    if conditions:
        query = query.where(and_(*conditions))

    if include_predictions:
        query = query.options(selectinload(Recording.predictions))

    result = await db.execute(query)
    recordings = result.scalars().all()

    # Build CSV
    output = io.StringIO()

    # Determine columns
    base_columns = [
        "recording_id", "timestamp_utc", "device_id",
        "latitude", "longitude", "duration_sec",
        "consensus_species", "consensus_confidence", "consensus_method"
    ]

    if include_predictions:
        # Get unique model names
        model_names = set()
        for rec in recordings:
            for pred in rec.predictions:
                if pred.rank == 1:
                    model_names.add(pred.model_name)
        model_names = sorted(model_names)

        # Add model-specific columns
        for model in model_names:
            base_columns.extend([f"{model}_species", f"{model}_confidence"])

    writer = csv.DictWriter(output, fieldnames=base_columns)
    writer.writeheader()

    for rec in recordings:
        row = {
            "recording_id": str(rec.id),
            "timestamp_utc": rec.timestamp_utc.isoformat(),
            "device_id": rec.device_id,
            "latitude": rec.latitude,
            "longitude": rec.longitude,
            "duration_sec": rec.duration_sec,
            "consensus_species": rec.consensus_species,
            "consensus_confidence": rec.consensus_confidence,
            "consensus_method": rec.consensus_method,
        }

        if include_predictions:
            for pred in rec.predictions:
                if pred.rank == 1:
                    row[f"{pred.model_name}_species"] = pred.species_common
                    row[f"{pred.model_name}_confidence"] = pred.confidence

        writer.writerow(row)

    output.seek(0)

    # Generate filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"birdsound_export_{timestamp}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/json")
async def export_json(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    species: Optional[str] = None,
    min_confidence: float = Query(0.0, ge=0, le=1),
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db)
):
    """
    Export recordings as JSON file.

    Returns a downloadable JSON with full recording and prediction data.
    """
    query = (
        select(Recording)
        .options(selectinload(Recording.predictions))
        .order_by(Recording.timestamp_utc.desc())
        .limit(limit)
    )

    # Apply filters
    conditions = []
    if start_date:
        conditions.append(Recording.timestamp_utc >= start_date)
    if end_date:
        conditions.append(Recording.timestamp_utc <= end_date)
    if device_id:
        conditions.append(Recording.device_id == device_id)
    if species:
        conditions.append(Recording.consensus_species.ilike(f"%{species}%"))
    if min_confidence > 0:
        conditions.append(Recording.consensus_confidence >= min_confidence)

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    recordings = result.scalars().all()

    # Build JSON structure
    data = {
        "export_timestamp": datetime.utcnow().isoformat(),
        "total_recordings": len(recordings),
        "filters": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "device_id": device_id,
            "species": species,
            "min_confidence": min_confidence,
        },
        "recordings": []
    }

    for rec in recordings:
        recording_data = {
            "id": str(rec.id),
            "timestamp_utc": rec.timestamp_utc.isoformat(),
            "device_id": rec.device_id,
            "location": {
                "latitude": rec.latitude,
                "longitude": rec.longitude,
                "altitude_m": rec.altitude_m,
            } if rec.latitude else None,
            "audio": {
                "duration_sec": rec.duration_sec,
                "sample_rate": rec.sample_rate,
                "format": rec.audio_format,
                "storage_path": rec.audio_storage_path,
            },
            "consensus": {
                "species": rec.consensus_species,
                "confidence": rec.consensus_confidence,
                "method": rec.consensus_method,
            },
            "predictions": [
                {
                    "model_name": pred.model_name,
                    "model_version": pred.model_version,
                    "species_code": pred.species_code,
                    "species_scientific": pred.species_scientific,
                    "species_common": pred.species_common,
                    "confidence": pred.confidence,
                    "rank": pred.rank,
                }
                for pred in sorted(rec.predictions, key=lambda p: (p.model_name, p.rank))
            ],
            "metadata": rec.metadata,
        }
        data["recordings"].append(recording_data)

    output = json.dumps(data, indent=2, default=str)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"birdsound_export_{timestamp}.json"

    return StreamingResponse(
        iter([output]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/geojson")
async def export_geojson(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    species: Optional[str] = None,
    min_confidence: float = Query(0.5, ge=0, le=1),
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db)
):
    """
    Export recordings as GeoJSON file.

    Returns a GeoJSON FeatureCollection for use in mapping applications.
    Only includes recordings with valid coordinates.
    """
    query = (
        select(Recording)
        .where(
            and_(
                Recording.latitude.isnot(None),
                Recording.longitude.isnot(None),
            )
        )
        .order_by(Recording.timestamp_utc.desc())
        .limit(limit)
    )

    # Apply filters
    conditions = []
    if start_date:
        conditions.append(Recording.timestamp_utc >= start_date)
    if end_date:
        conditions.append(Recording.timestamp_utc <= end_date)
    if device_id:
        conditions.append(Recording.device_id == device_id)
    if species:
        conditions.append(Recording.consensus_species.ilike(f"%{species}%"))
    if min_confidence > 0:
        conditions.append(Recording.consensus_confidence >= min_confidence)

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    recordings = result.scalars().all()

    # Build GeoJSON
    features = []
    for rec in recordings:
        if not rec.latitude or not rec.longitude:
            continue

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [rec.longitude, rec.latitude]  # GeoJSON uses [lon, lat]
            },
            "properties": {
                "recording_id": str(rec.id),
                "timestamp": rec.timestamp_utc.isoformat(),
                "device_id": rec.device_id,
                "species": rec.consensus_species,
                "confidence": rec.consensus_confidence,
                "duration_sec": rec.duration_sec,
            }
        }

        if rec.altitude_m:
            feature["geometry"]["coordinates"].append(rec.altitude_m)

        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "export_timestamp": datetime.utcnow().isoformat(),
            "total_features": len(features),
        }
    }

    output = json.dumps(geojson, indent=2, default=str)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"birdsound_export_{timestamp}.geojson"

    return StreamingResponse(
        iter([output]),
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/species-summary")
async def export_species_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    device_id: Optional[str] = None,
    min_confidence: float = Query(0.3, ge=0, le=1),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Export species summary statistics.

    Returns aggregated data per species:
    - Detection count
    - Average confidence
    - First/last detection
    - Location spread
    """
    from sqlalchemy import func

    # Base query
    conditions = [Recording.consensus_species.isnot(None)]

    if start_date:
        conditions.append(Recording.timestamp_utc >= start_date)
    if end_date:
        conditions.append(Recording.timestamp_utc <= end_date)
    if device_id:
        conditions.append(Recording.device_id == device_id)
    if min_confidence > 0:
        conditions.append(Recording.consensus_confidence >= min_confidence)

    query = (
        select(
            Recording.consensus_species,
            func.count().label("detection_count"),
            func.avg(Recording.consensus_confidence).label("avg_confidence"),
            func.min(Recording.timestamp_utc).label("first_detection"),
            func.max(Recording.timestamp_utc).label("last_detection"),
            func.avg(Recording.latitude).label("avg_lat"),
            func.avg(Recording.longitude).label("avg_lon"),
        )
        .where(and_(*conditions))
        .group_by(Recording.consensus_species)
        .order_by(func.count().desc())
    )

    result = await db.execute(query)
    rows = result.all()

    # Build response
    species_data = []
    for row in rows:
        species_data.append({
            "species": row.consensus_species,
            "detection_count": row.detection_count,
            "avg_confidence": round(row.avg_confidence, 3) if row.avg_confidence else None,
            "first_detection": row.first_detection.isoformat() if row.first_detection else None,
            "last_detection": row.last_detection.isoformat() if row.last_detection else None,
            "avg_latitude": round(row.avg_lat, 4) if row.avg_lat else None,
            "avg_longitude": round(row.avg_lon, 4) if row.avg_lon else None,
        })

    if format == "csv":
        output = io.StringIO()
        if species_data:
            writer = csv.DictWriter(output, fieldnames=species_data[0].keys())
            writer.writeheader()
            writer.writerows(species_data)
        output.seek(0)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=species_summary_{timestamp}.csv"}
        )

    return {
        "export_timestamp": datetime.utcnow().isoformat(),
        "total_species": len(species_data),
        "total_detections": sum(s["detection_count"] for s in species_data),
        "species": species_data,
    }
