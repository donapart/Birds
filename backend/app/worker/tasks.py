"""
Celery background tasks for BirdSound.

Tasks:
- Batch audio processing
- Data cleanup
- Statistics computation
- Model performance tracking
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)


def run_async(coro):
    """Run async function in sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(bind=True, max_retries=3)
def process_audio_batch(self, audio_chunks: List[dict]) -> dict:
    """
    Process multiple audio chunks in batch.

    Args:
        audio_chunks: List of audio chunk dicts with base64 audio and metadata

    Returns:
        Dict with processing results
    """
    async def _process():
        from app.services.prediction_service import PredictionService
        from app.schemas.audio import AudioChunkRequest

        service = PredictionService(db=None)
        results = []

        for chunk in audio_chunks:
            try:
                request = AudioChunkRequest(**chunk)
                prediction = await service.process_audio_chunk(
                    request,
                    store_in_db=False
                )
                results.append({
                    "success": True,
                    "recording_id": str(prediction.recording_id),
                    "species": prediction.consensus.species_common,
                    "confidence": prediction.consensus.confidence,
                })
            except Exception as e:
                logger.error(f"Failed to process chunk: {e}")
                results.append({
                    "success": False,
                    "error": str(e),
                })

        return {
            "total": len(audio_chunks),
            "successful": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
            "results": results,
        }

    try:
        return run_async(_process())
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        self.retry(exc=e, countdown=60)


@celery_app.task
def cleanup_old_recordings(days: int = 30) -> dict:
    """
    Clean up old recordings from database and storage.

    Args:
        days: Delete recordings older than this many days

    Returns:
        Dict with cleanup statistics
    """
    async def _cleanup():
        from sqlalchemy import delete, select
        from app.db.database import async_session_maker
        from app.db.models import Recording
        from app.services.audio_storage import audio_storage

        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted_count = 0
        storage_deleted = 0

        async with async_session_maker() as session:
            # Get recordings to delete
            result = await session.execute(
                select(Recording)
                .where(Recording.timestamp_utc < cutoff_date)
            )
            old_recordings = result.scalars().all()

            for recording in old_recordings:
                # Delete from storage
                if recording.audio_storage_path:
                    try:
                        await audio_storage.delete_recording(recording.audio_storage_path)
                        storage_deleted += 1
                    except Exception as e:
                        logger.warning(f"Failed to delete audio: {e}")

            # Delete from database (cascades to predictions)
            result = await session.execute(
                delete(Recording)
                .where(Recording.timestamp_utc < cutoff_date)
            )
            deleted_count = result.rowcount
            await session.commit()

        logger.info(f"Cleaned up {deleted_count} recordings older than {days} days")

        return {
            "cutoff_date": cutoff_date.isoformat(),
            "recordings_deleted": deleted_count,
            "storage_files_deleted": storage_deleted,
        }

    return run_async(_cleanup())


@celery_app.task
def update_model_statistics() -> dict:
    """
    Compute and store model performance statistics.

    Calculates:
    - Total predictions per model
    - Average confidence
    - Agreement rate with consensus
    - Top predicted species
    """
    async def _update():
        from sqlalchemy import select, func, and_
        from app.db.database import async_session_maker
        from app.db.models import Recording, Prediction, ModelPerformance
        import uuid

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        stats = {}

        async with async_session_maker() as session:
            # Get unique model names
            result = await session.execute(
                select(Prediction.model_name).distinct()
            )
            model_names = [row[0] for row in result.all()]

            for model_name in model_names:
                # Total predictions today
                count_result = await session.execute(
                    select(func.count())
                    .select_from(Prediction)
                    .join(Recording)
                    .where(
                        and_(
                            Prediction.model_name == model_name,
                            Recording.timestamp_utc >= today,
                        )
                    )
                )
                total = count_result.scalar() or 0

                # Average confidence
                conf_result = await session.execute(
                    select(func.avg(Prediction.confidence))
                    .where(
                        and_(
                            Prediction.model_name == model_name,
                            Prediction.rank == 1,
                        )
                    )
                )
                avg_confidence = conf_result.scalar()

                # Average inference time
                time_result = await session.execute(
                    select(func.avg(Prediction.inference_time_ms))
                    .where(Prediction.model_name == model_name)
                )
                avg_time = time_result.scalar()

                # Agreement rate (top-1 matches consensus)
                agree_result = await session.execute(
                    select(func.count())
                    .select_from(Prediction)
                    .join(Recording)
                    .where(
                        and_(
                            Prediction.model_name == model_name,
                            Prediction.rank == 1,
                            Prediction.species_common == Recording.consensus_species,
                        )
                    )
                )
                agreements = agree_result.scalar() or 0

                total_top1 = await session.execute(
                    select(func.count())
                    .select_from(Prediction)
                    .where(
                        and_(
                            Prediction.model_name == model_name,
                            Prediction.rank == 1,
                        )
                    )
                )
                total_top1_count = total_top1.scalar() or 1
                agreement_rate = agreements / total_top1_count if total_top1_count > 0 else 0

                # Top species
                top_species_result = await session.execute(
                    select(
                        Prediction.species_common,
                        func.count().label("count")
                    )
                    .where(
                        and_(
                            Prediction.model_name == model_name,
                            Prediction.rank == 1,
                        )
                    )
                    .group_by(Prediction.species_common)
                    .order_by(func.count().desc())
                    .limit(10)
                )
                top_species = {row[0]: row[1] for row in top_species_result.all()}

                # Store statistics
                perf = ModelPerformance(
                    id=uuid.uuid4(),
                    model_name=model_name,
                    date=today,
                    total_predictions=total,
                    avg_confidence=avg_confidence,
                    avg_inference_time_ms=avg_time,
                    consensus_agreement_rate=agreement_rate,
                    top_species=top_species,
                )
                session.add(perf)

                stats[model_name] = {
                    "total_predictions": total,
                    "avg_confidence": avg_confidence,
                    "avg_inference_time_ms": avg_time,
                    "consensus_agreement_rate": agreement_rate,
                }

            await session.commit()

        logger.info(f"Updated statistics for {len(model_names)} models")
        return stats

    return run_async(_update())


@celery_app.task
def sync_species_database() -> dict:
    """
    Sync species database from external sources.

    Could be extended to fetch from:
    - eBird API
    - Wikipedia
    - Xeno-canto for audio samples
    """
    async def _sync():
        from app.db.database import async_session_maker
        from app.db.models import Species
        from app.data.species_europe import EUROPEAN_SPECIES
        from sqlalchemy import select

        added = 0
        updated = 0

        async with async_session_maker() as session:
            for species_data in EUROPEAN_SPECIES:
                result = await session.execute(
                    select(Species)
                    .where(Species.species_code == species_data["species_code"])
                )
                existing = result.scalar_one_or_none()

                if existing:
                    # Update if needed
                    if existing.birdnet_label != species_data.get("birdnet_label"):
                        existing.birdnet_label = species_data.get("birdnet_label")
                        updated += 1
                else:
                    # Add new
                    species = Species(
                        species_code=species_data["species_code"],
                        scientific_name=species_data["scientific_name"],
                        common_name_en=species_data["common_name_en"],
                        common_name_de=species_data.get("common_name_de"),
                        family=species_data.get("family"),
                        order_name=species_data.get("order_name"),
                        native_to_europe=species_data.get("native_to_europe", False),
                        native_to_germany=species_data.get("native_to_germany", False),
                        birdnet_label=species_data.get("birdnet_label"),
                    )
                    session.add(species)
                    added += 1

            await session.commit()

        logger.info(f"Species sync: {added} added, {updated} updated")
        return {"added": added, "updated": updated}

    return run_async(_sync())


@celery_app.task(bind=True)
def store_recording_audio(
    self,
    recording_id: str,
    audio_base64: str,
    audio_format: str,
    sample_rate: int,
    metadata: dict
) -> dict:
    """
    Store audio file for a recording.

    Runs in background to not block API response.
    """
    async def _store():
        import base64
        from uuid import UUID
        from sqlalchemy import update
        from app.db.database import async_session_maker
        from app.db.models import Recording
        from app.services.audio_storage import audio_storage

        rec_id = UUID(recording_id)
        audio_bytes = base64.b64decode(audio_base64)

        # Save to storage
        path = await audio_storage.save_recording(
            recording_id=rec_id,
            audio_data=audio_bytes,
            source_format=audio_format,
            sample_rate=sample_rate,
            timestamp=metadata.get("timestamp"),
            device_id=metadata.get("device_id"),
            location=(metadata.get("latitude"), metadata.get("longitude"))
            if metadata.get("latitude") else None,
        )

        # Update database with storage path
        async with async_session_maker() as session:
            await session.execute(
                update(Recording)
                .where(Recording.id == rec_id)
                .values(audio_storage_path=path)
            )
            await session.commit()

        return {"recording_id": recording_id, "storage_path": path}

    try:
        return run_async(_store())
    except Exception as e:
        logger.error(f"Failed to store audio: {e}")
        self.retry(exc=e, countdown=30)


@celery_app.task
def generate_daily_report(date: Optional[str] = None) -> dict:
    """
    Generate daily detection report.

    Args:
        date: Date string (YYYY-MM-DD) or None for yesterday

    Returns:
        Report data
    """
    async def _generate():
        from sqlalchemy import select, func, and_
        from app.db.database import async_session_maker
        from app.db.models import Recording

        if date:
            report_date = datetime.strptime(date, "%Y-%m-%d")
        else:
            report_date = datetime.utcnow() - timedelta(days=1)

        start = report_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        async with async_session_maker() as session:
            # Total recordings
            total_result = await session.execute(
                select(func.count())
                .select_from(Recording)
                .where(and_(
                    Recording.timestamp_utc >= start,
                    Recording.timestamp_utc < end,
                ))
            )
            total = total_result.scalar() or 0

            # Unique species
            species_result = await session.execute(
                select(func.count(func.distinct(Recording.consensus_species)))
                .where(and_(
                    Recording.timestamp_utc >= start,
                    Recording.timestamp_utc < end,
                    Recording.consensus_species.isnot(None),
                ))
            )
            unique_species = species_result.scalar() or 0

            # Top species
            top_result = await session.execute(
                select(
                    Recording.consensus_species,
                    func.count().label("count"),
                    func.avg(Recording.consensus_confidence).label("avg_conf"),
                )
                .where(and_(
                    Recording.timestamp_utc >= start,
                    Recording.timestamp_utc < end,
                    Recording.consensus_species.isnot(None),
                ))
                .group_by(Recording.consensus_species)
                .order_by(func.count().desc())
                .limit(10)
            )
            top_species = [
                {
                    "species": row[0],
                    "count": row[1],
                    "avg_confidence": round(row[2], 3) if row[2] else None,
                }
                for row in top_result.all()
            ]

            # Unique devices
            devices_result = await session.execute(
                select(func.count(func.distinct(Recording.device_id)))
                .where(and_(
                    Recording.timestamp_utc >= start,
                    Recording.timestamp_utc < end,
                ))
            )
            unique_devices = devices_result.scalar() or 0

        return {
            "date": start.strftime("%Y-%m-%d"),
            "total_recordings": total,
            "unique_species": unique_species,
            "unique_devices": unique_devices,
            "top_species": top_species,
        }

    return run_async(_generate())
