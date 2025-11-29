#!/usr/bin/env python
"""
Download BirdNET and HuggingFace models for production use.

This script downloads the required model files for the BirdSound application:
- BirdNET ONNX model from HuggingFace
- BirdNET labels file
- Pre-caches HuggingFace Transformers model

Usage:
    python scripts/download_models.py
    
    # Download only specific models
    python scripts/download_models.py --birdnet-only
    python scripts/download_models.py --hf-only
    
    # Specify custom output directory
    python scripts/download_models.py --output-dir ./models
"""
import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def download_birdnet_models(output_dir: Path) -> bool:
    """
    Download BirdNET ONNX model and labels.
    
    Args:
        output_dir: Directory to save models
        
    Returns:
        True if successful, False otherwise
    """
    try:
        import urllib.request
        
        logger.info("=" * 60)
        logger.info("Downloading BirdNET Models")
        logger.info("=" * 60)
        
        birdnet_dir = output_dir / "birdnet"
        birdnet_dir.mkdir(parents=True, exist_ok=True)
        
        # Model URLs (BirdNET GLOBAL 6K V2.4)
        base_url = "https://huggingface.co/kahst/BirdNET-onnx/resolve/main"
        
        files = {
            "BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx": f"{base_url}/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx",
            "BirdNET_GLOBAL_6K_V2.4_Labels.txt": f"{base_url}/BirdNET_GLOBAL_6K_V2.4_Labels.txt"
        }
        
        for filename, url in files.items():
            output_path = birdnet_dir / filename
            
            if output_path.exists():
                logger.info(f"✓ {filename} already exists, skipping")
                continue
            
            logger.info(f"Downloading {filename}...")
            logger.info(f"  URL: {url}")
            
            # Download with progress
            def reporthook(count, block_size, total_size):
                if total_size > 0:
                    percent = int(count * block_size * 100 / total_size)
                    sys.stdout.write(f"\r  Progress: {percent}% ({count * block_size / 1024 / 1024:.1f} MB)")
                    sys.stdout.flush()
            
            urllib.request.urlretrieve(url, output_path, reporthook)
            print()  # New line after progress
            logger.info(f"✓ Downloaded {filename} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
        
        logger.info("")
        logger.info("BirdNET models downloaded successfully!")
        logger.info(f"Location: {birdnet_dir.absolute()}")
        logger.info("")
        
        # Show how to configure
        logger.info("Add to your .env file:")
        logger.info(f"BIRDNET_MODEL_PATH={birdnet_dir / 'BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx'}")
        logger.info(f"BIRDNET_LABELS_PATH={birdnet_dir / 'BirdNET_GLOBAL_6K_V2.4_Labels.txt'}")
        logger.info("")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to download BirdNET models: {e}")
        return False


def download_hf_models(model_name: str = "dima806/bird_sounds_classification") -> bool:
    """
    Pre-cache HuggingFace model.
    
    Args:
        model_name: HuggingFace model identifier
        
    Returns:
        True if successful, False otherwise
    """
    try:
        logger.info("=" * 60)
        logger.info("Downloading HuggingFace Model")
        logger.info("=" * 60)
        logger.info(f"Model: {model_name}")
        logger.info("")
        
        from transformers import pipeline
        
        logger.info("Downloading and caching model (this may take a while)...")
        pipe = pipeline(
            "audio-classification",
            model=model_name,
            device=-1  # CPU
        )
        
        logger.info("")
        logger.info(f"✓ HuggingFace model '{model_name}' downloaded and cached")
        logger.info("")
        logger.info("Add to your .env file:")
        logger.info(f"HF_MODEL_NAME={model_name}")
        logger.info("")
        
        return True
        
    except ImportError:
        logger.error("transformers not installed. Install with: pip install transformers torch")
        return False
    except Exception as e:
        logger.error(f"Failed to download HuggingFace model: {e}")
        return False


def verify_dependencies() -> dict:
    """
    Check if required dependencies are installed.
    
    Returns:
        Dict with dependency status
    """
    deps = {}
    
    try:
        import onnxruntime
        deps['onnxruntime'] = True
    except ImportError:
        deps['onnxruntime'] = False
    
    try:
        import transformers
        import torch
        deps['transformers'] = True
        deps['torch'] = True
    except ImportError:
        deps['transformers'] = False
        deps['torch'] = False
    
    return deps


def main():
    parser = argparse.ArgumentParser(
        description="Download BirdNET and HuggingFace models"
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("./models"),
        help="Output directory for models (default: ./models)"
    )
    parser.add_argument(
        "--birdnet-only",
        action="store_true",
        help="Download only BirdNET models"
    )
    parser.add_argument(
        "--hf-only",
        action="store_true",
        help="Download only HuggingFace models"
    )
    parser.add_argument(
        "--hf-model",
        type=str,
        default="dima806/bird_sounds_classification",
        help="HuggingFace model name (default: dima806/bird_sounds_classification)"
    )
    
    args = parser.parse_args()
    
    logger.info("🐦 BirdSound Model Downloader")
    logger.info("")
    
    # Check dependencies
    logger.info("Checking dependencies...")
    deps = verify_dependencies()
    
    for dep, installed in deps.items():
        status = "✓" if installed else "✗"
        logger.info(f"  {status} {dep}")
    
    logger.info("")
    
    if not deps.get('onnxruntime') and not args.hf_only:
        logger.warning("onnxruntime not installed. Install with: pip install onnxruntime")
        logger.warning("Skipping BirdNET download")
        args.hf_only = True
    
    if not (deps.get('transformers') and deps.get('torch')) and not args.birdnet_only:
        logger.warning("transformers or torch not installed.")
        logger.warning("Install with: pip install transformers torch")
        logger.warning("Skipping HuggingFace download")
        args.birdnet_only = True
    
    # Download models
    success = True
    
    if not args.hf_only:
        if not download_birdnet_models(args.output_dir):
            success = False
    
    if not args.birdnet_only:
        if not download_hf_models(args.hf_model):
            success = False
    
    # Final summary
    logger.info("=" * 60)
    if success:
        logger.info("✓ All models downloaded successfully!")
        logger.info("")
        logger.info("Next steps:")
        logger.info("1. Update your .env file with the paths shown above")
        logger.info("2. Set USE_MODEL_STUBS=false to use production models")
        logger.info("3. Start your application")
    else:
        logger.error("✗ Some downloads failed. Check errors above.")
        return 1
    
    logger.info("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
