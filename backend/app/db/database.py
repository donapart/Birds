"""
Database connection and session management.
Uses SQLAlchemy async with PostgreSQL/PostGIS or SQLite (explicit opt-in).
"""
import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Determine database URL based on configuration
if settings.USE_SQLITE:
    DATABASE_URL = f"sqlite+aiosqlite:///{settings.SQLITE_PATH}"
    logger.info(f"Using SQLite database: {settings.SQLITE_PATH}")
else:
    DATABASE_URL = settings.DATABASE_URL.replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    logger.info("Using PostgreSQL database")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


def _run_migrations() -> None:
    """Apply Alembic migrations up to head (blocking, run in a thread)."""
    from alembic import command
    from alembic.config import Config

    backend_dir = Path(__file__).resolve().parents[2]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    command.upgrade(cfg, "head")


async def init_db() -> None:
    """Initialize the database schema.

    - PostgreSQL: apply Alembic migrations (single source of truth).
      Existing databases created via create_all must be stamped once:
      ``alembic stamp head``.
    - SQLite (explicit opt-in via USE_SQLITE): create tables directly,
      intended for tests and lightweight local development.

    A failing database is a fatal startup error - there is deliberately
    no silent fallback to SQLite anymore.
    """
    if settings.USE_SQLITE:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite database initialized")
        return

    try:
        await asyncio.to_thread(_run_migrations)
        logger.info("Database migrations applied (alembic upgrade head)")
    except Exception:
        logger.error(
            "Database initialization failed. Check DATABASE_URL and that "
            "PostgreSQL is reachable; for pre-Alembic databases run "
            "'alembic stamp head' once."
        )
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
