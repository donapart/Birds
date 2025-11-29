"""
Celery application configuration for background tasks.

Usage:
    # Start worker
    celery -A app.worker.celery_app worker --loglevel=info

    # Start beat scheduler (for periodic tasks)
    celery -A app.worker.celery_app beat --loglevel=info
"""
import os
from celery import Celery

# Default broker (Redis)
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

# Create Celery app
celery_app = Celery(
    "birdsound",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "app.worker.tasks",
    ]
)

# Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=600,  # 10 minutes max
    task_soft_time_limit=300,  # 5 minutes soft limit

    # Worker settings
    worker_prefetch_multiplier=1,
    worker_concurrency=4,

    # Result settings
    result_expires=3600,  # 1 hour

    # Beat schedule (periodic tasks)
    beat_schedule={
        "cleanup-old-recordings": {
            "task": "app.worker.tasks.cleanup_old_recordings",
            "schedule": 3600.0,  # Every hour
        },
        "update-model-statistics": {
            "task": "app.worker.tasks.update_model_statistics",
            "schedule": 86400.0,  # Every day
        },
        "sync-species-database": {
            "task": "app.worker.tasks.sync_species_database",
            "schedule": 604800.0,  # Every week
        },
    },
)


# Optional: Configure for testing without broker
if os.getenv("CELERY_TASK_ALWAYS_EAGER"):
    celery_app.conf.update(
        task_always_eager=True,
        task_eager_propagates=True,
    )
