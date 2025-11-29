#!/usr/bin/env python
"""
Quick start script for BirdSound backend.

This script helps you get started with the BirdSound application by:
1. Checking dependencies
2. Setting up configuration
3. Initializing the database
4. Optionally downloading models

Usage:
    python scripts/setup.py
"""
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)


def check_python_version():
    """Check if Python version is 3.9+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        logger.error(f"Python 3.9+ required, found {version.major}.{version.minor}")
        return False
    logger.info(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_dependencies():
    """Check if required Python packages are installed."""
    logger.info("\nChecking Python dependencies...")
    
    required = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'pydantic',
        'pydantic_settings',
        'numpy',
    ]
    
    optional = {
        'onnxruntime': 'For BirdNET production model',
        'transformers': 'For HuggingFace production models',
        'torch': 'For HuggingFace production models',
    }
    
    missing = []
    for package in required:
        try:
            __import__(package.replace('-', '_'))
            logger.info(f"  ✓ {package}")
        except ImportError:
            logger.warning(f"  ✗ {package} (required)")
            missing.append(package)
    
    for package, description in optional.items():
        try:
            __import__(package.replace('-', '_'))
            logger.info(f"  ✓ {package}")
        except ImportError:
            logger.info(f"  ○ {package} (optional - {description})")
    
    if missing:
        logger.error(f"\nMissing required packages: {', '.join(missing)}")
        logger.error("Install with: pip install -r requirements.txt")
        return False
    
    return True


def setup_env_file():
    """Create .env file from .env.example if it doesn't exist."""
    logger.info("\nSetting up configuration...")
    
    env_example = Path(".env.example")
    env_file = Path(".env")
    
    if not env_example.exists():
        logger.error(".env.example not found!")
        return False
    
    if env_file.exists():
        logger.info("✓ .env already exists")
        return True
    
    shutil.copy(env_example, env_file)
    logger.info("✓ Created .env from .env.example")
    logger.info("  Edit .env to customize your configuration")
    
    return True


def create_directories():
    """Create necessary directories."""
    logger.info("\nCreating directories...")
    
    dirs = [
        "storage/audio",
        "models/birdnet",
        "logs",
    ]
    
    for dir_path in dirs:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        logger.info(f"  ✓ {dir_path}")
    
    return True


def check_postgres():
    """Check if PostgreSQL is accessible."""
    logger.info("\nChecking database...")
    
    # Read DATABASE_URL from .env
    db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/birdsound')
    
    try:
        import asyncpg
        import asyncio
        
        async def test_connection():
            # Parse connection string
            if db_url.startswith('postgresql+asyncpg://'):
                url = db_url.replace('postgresql+asyncpg://', 'postgresql://')
            else:
                url = db_url.replace('postgresql://', 'postgresql://')
            
            try:
                conn = await asyncpg.connect(url)
                await conn.close()
                return True
            except Exception as e:
                logger.warning(f"  ✗ Cannot connect to PostgreSQL: {e}")
                logger.info("  Start PostgreSQL with: docker-compose up db -d")
                return False
        
        result = asyncio.run(test_connection())
        if result:
            logger.info("  ✓ PostgreSQL is accessible")
        return result
        
    except ImportError:
        logger.warning("  ○ asyncpg not installed, skipping database check")
        return True


def main():
    """Run setup."""
    logger.info("=" * 60)
    logger.info("🐦 BirdSound Backend Setup")
    logger.info("=" * 60)
    
    # Check Python version
    if not check_python_version():
        return 1
    
    # Check dependencies
    if not check_dependencies():
        return 1
    
    # Setup .env
    if not setup_env_file():
        return 1
    
    # Create directories
    if not create_directories():
        return 1
    
    # Check PostgreSQL
    check_postgres()
    
    # Final instructions
    logger.info("\n" + "=" * 60)
    logger.info("✓ Setup complete!")
    logger.info("=" * 60)
    logger.info("\nNext steps:")
    logger.info("\n1. For development/testing (with stub models):")
    logger.info("   uvicorn app.main:app --reload")
    logger.info("\n2. For production (with real ML models):")
    logger.info("   a. Download models:")
    logger.info("      python scripts/download_models.py")
    logger.info("   b. Update .env:")
    logger.info("      USE_MODEL_STUBS=false")
    logger.info("   c. Start server:")
    logger.info("      uvicorn app.main:app --host 0.0.0.0 --port 8000")
    logger.info("\n3. Run tests:")
    logger.info("   pytest tests/")
    logger.info("\n4. Start with Docker:")
    logger.info("   docker-compose up")
    logger.info("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
