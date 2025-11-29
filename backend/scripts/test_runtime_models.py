#!/usr/bin/env python
"""
Test script for runtime models.

Usage:
    # With stubs (fast, no model files needed)
    USE_MODEL_STUBS=true python test_runtime_models.py
    
    # With production models (requires model files)
    USE_MODEL_STUBS=false python test_runtime_models.py
"""
import asyncio
import logging
import sys
from pathlib import Path

import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import get_settings
from app.services.model_registry import ModelRegistry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_models():
    """Test model loading and prediction."""
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("Testing Bird Sound Models")
    logger.info("=" * 60)
    logger.info(f"USE_MODEL_STUBS: {settings.USE_MODEL_STUBS}")
    logger.info("")
    
    # Create registry
    registry = ModelRegistry()
    
    try:
        # Load models
        logger.info("Loading models...")
        await registry.load_models()
        logger.info(f"✓ Loaded {len(registry.models)} models")
        logger.info("")
        
        # List models
        model_names = registry.list_models()
        logger.info(f"Available models: {model_names}")
        logger.info("")
        
        # Generate test audio
        logger.info("Generating test audio (3 seconds @ 48kHz)...")
        duration = 3.0
        sample_rate = 48000
        samples = int(duration * sample_rate)
        
        # Create audio with bird-like chirp pattern
        t = np.linspace(0, duration, samples, dtype=np.float32)
        frequency = 3000  # 3kHz chirp
        audio = 0.3 * np.sin(2 * np.pi * frequency * t)
        
        # Add some amplitude modulation for realism
        modulation = 1 + 0.5 * np.sin(2 * np.pi * 5 * t)
        audio = audio * modulation
        
        logger.info(f"✓ Audio shape: {audio.shape}, dtype: {audio.dtype}")
        logger.info(f"  RMS: {np.sqrt(np.mean(audio**2)):.4f}")
        logger.info("")
        
        # Run predictions
        logger.info("Running predictions...")
        results = await registry.predict_all(audio)
        logger.info(f"✓ Got results from {len(results)} models")
        logger.info("")
        
        # Display results
        for output in results:
            logger.info(f"Model: {output.model_name}")
            logger.info(f"  Version: {output.model_version}")
            logger.info("  Predictions:")
            for pred in output.predictions[:3]:
                logger.info(
                    f"    {pred.rank}. {pred.species_common} "
                    f"({pred.confidence:.2%})"
                )
            logger.info("")
        
        # Compute consensus
        logger.info("Computing consensus...")
        for method in ["majority_vote", "weighted_average", "max_confidence"]:
            consensus = registry.compute_consensus(results, method=method)
            if consensus:
                logger.info(
                    f"  {method:20s}: {consensus['species_common']} "
                    f"({consensus['confidence']:.2%}, "
                    f"agreement: {consensus['agreement_count']}/{consensus['total_models']})"
                )
        logger.info("")
        
        logger.info("=" * 60)
        logger.info("✓ All tests passed!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"✗ Test failed: {e}", exc_info=True)
        return 1
    finally:
        # Cleanup
        await registry.unload_models()
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(test_models())
    sys.exit(exit_code)
