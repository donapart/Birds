"""
Database connection and session management.
Uses SQLAlchemy async with PostgreSQL/PostGIS or SQLite fallback.
"""
import logging
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


async def init_db() -> None:
    """Initialize database tables."""
    global engine, async_session_maker
    
    try:
        async with engine.begin() as conn:
            # Enable PostGIS extension (if PostgreSQL)
            if not settings.USE_SQLITE:
                try:
                    await conn.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                except Exception:
                    pass  # PostGIS might not be available

            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        
        # Fallback to SQLite if PostgreSQL fails
        if not settings.USE_SQLITE and "postgresql" in DATABASE_URL:
            logger.warning("PostgreSQL unavailable, switching to SQLite fallback")
            
            engine = create_async_engine(
                f"sqlite+aiosqlite:///{settings.SQLITE_PATH}",
                echo=settings.DEBUG,
                future=True,
            )
            
            async_session_maker = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
            
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            logger.info(f"Switched to SQLite: {settings.SQLITE_PATH}")
        else:
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
