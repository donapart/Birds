#!/usr/bin/env python3
"""
Model Download Script for BirdSound

Downloads required ML models from HuggingFace and other sources.

Usage:
    python scripts/download_models.py
    python scripts/download_models.py --models birdnet
    python scripts/download_models.py --models birdnet huggingface
"""

import argparse
import hashlib
import os
import sys
from pathlib import Path
from urllib.request import urlretrieve
from urllib.error import URLError

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Model configurations
MODELS = {
    "birdnet": {
        "name": "BirdNET v2.4",
        "files": [
            {
                "url": "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx",
                "path": "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP32.onnx",
                "size_mb": 150,
                "sha256": None,  # Add checksum if known
            },
            {
                "url": "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Labels.txt",
                "path": "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Labels.txt",
                "size_mb": 0.5,
                "sha256": None,
            },
        ],
        "description": "BirdNET global model with 6000+ species support",
    },
    "birdnet-fp16": {
        "name": "BirdNET v2.4 (FP16 - smaller)",
        "files": [
            {
                "url": "https://huggingface.co/kahst/BirdNET-onnx/resolve/main/BirdNET_GLOBAL_6K_V2.4_Model_FP16.onnx",
                "path": "models/birdnet/BirdNET_GLOBAL_6K_V2.4_Model_FP16.onnx",
                "size_mb": 75,
                "sha256": None,
            },
        ],
        "description": "Half-precision model for faster inference (requires compatible hardware)",
    },
    "huggingface": {
        "name": "HuggingFace Bird Classifier",
        "download_func": "download_huggingface_model",
        "model_id": "dima806/bird_sounds_classification",
        "description": "Transformer-based bird sound classifier from HuggingFace Hub",
    },
}


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent


def download_progress(block_num: int, block_size: int, total_size: int) -> None:
    """Progress callback for urlretrieve."""
    if total_size > 0:
        percent = min(100, (block_num * block_size * 100) // total_size)
        downloaded_mb = (block_num * block_size) / (1024 * 1024)
        total_mb = total_size / (1024 * 1024)
        sys.stdout.write(f"\r  Progress: {percent}% ({downloaded_mb:.1f}/{total_mb:.1f} MB)")
        sys.stdout.flush()


def verify_checksum(file_path: Path, expected_sha256: str) -> bool:
    """Verify file checksum."""
    if not expected_sha256:
        return True

    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)

    return sha256_hash.hexdigest() == expected_sha256


def download_file(url: str, dest_path: Path, expected_size_mb: float = None, sha256: str = None) -> bool:
    """Download a file with progress indication."""
    # Create directory if needed
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # Check if file already exists
    if dest_path.exists():
        existing_size_mb = dest_path.stat().st_size / (1024 * 1024)
        if expected_size_mb and abs(existing_size_mb - expected_size_mb) < 1:
            print(f"  File already exists: {dest_path}")
            if sha256 and not verify_checksum(dest_path, sha256):
                print("  Warning: Checksum mismatch, re-downloading...")
            else:
                return True

    print(f"  Downloading: {url}")
    print(f"  Destination: {dest_path}")

    try:
        urlretrieve(url, str(dest_path), reporthook=download_progress)
        print()  # New line after progress

        # Verify checksum
        if sha256 and not verify_checksum(dest_path, sha256):
            print("  Error: Checksum verification failed!")
            dest_path.unlink()
            return False

        print("  Download complete!")
        return True

    except URLError as e:
        print(f"\n  Error downloading: {e}")
        return False
    except Exception as e:
        print(f"\n  Unexpected error: {e}")
        return False


def download_huggingface_model(model_id: str) -> bool:
    """Download a model from HuggingFace Hub."""
    try:
        from transformers import AutoModelForAudioClassification, AutoFeatureExtractor

        print(f"  Downloading from HuggingFace: {model_id}")
        print("  This will download to HuggingFace cache (~/.cache/huggingface)")

        # Download model and tokenizer
        print("  Downloading feature extractor...")
        AutoFeatureExtractor.from_pretrained(model_id)

        print("  Downloading model weights...")
        AutoModelForAudioClassification.from_pretrained(model_id)

        print("  HuggingFace model downloaded successfully!")
        return True

    except ImportError:
        print("  Error: transformers library not installed")
        print("  Install with: pip install transformers torch")
        return False
    except Exception as e:
        print(f"  Error downloading HuggingFace model: {e}")
        return False


def download_model(model_key: str) -> bool:
    """Download a specific model."""
    if model_key not in MODELS:
        print(f"Unknown model: {model_key}")
        return False

    model_config = MODELS[model_key]
    print(f"\n{'='*60}")
    print(f"Downloading: {model_config['name']}")
    print(f"Description: {model_config['description']}")
    print(f"{'='*60}")

    # Check if this is a HuggingFace model
    if "download_func" in model_config:
        if model_config["download_func"] == "download_huggingface_model":
            return download_huggingface_model(model_config["model_id"])
        else:
            print(f"Unknown download function: {model_config['download_func']}")
            return False

    # Download files
    root = get_project_root()
    all_success = True

    for file_info in model_config.get("files", []):
        dest_path = root / file_info["path"]
        success = download_file(
            url=file_info["url"],
            dest_path=dest_path,
            expected_size_mb=file_info.get("size_mb"),
            sha256=file_info.get("sha256"),
        )
        if not success:
            all_success = False

    return all_success


def list_models() -> None:
    """List available models."""
    print("\nAvailable models:")
    print("-" * 60)
    for key, config in MODELS.items():
        print(f"  {key:20} - {config['name']}")
        print(f"                       {config['description']}")
        if "files" in config:
            total_size = sum(f.get("size_mb", 0) for f in config["files"])
            print(f"                       Size: ~{total_size:.0f} MB")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Download ML models for BirdSound",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/download_models.py                    # Download all models
  python scripts/download_models.py --models birdnet   # Download only BirdNET
  python scripts/download_models.py --list             # List available models
        """,
    )

    parser.add_argument(
        "--models",
        nargs="+",
        choices=list(MODELS.keys()),
        help="Specific models to download (default: all)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available models",
    )

    args = parser.parse_args()

    if args.list:
        list_models()
        return

    # Determine which models to download
    models_to_download = args.models or ["birdnet", "huggingface"]

    print("BirdSound Model Downloader")
    print("=" * 60)
    print(f"Project root: {get_project_root()}")
    print(f"Models to download: {', '.join(models_to_download)}")

    # Download each model
    results = {}
    for model_key in models_to_download:
        results[model_key] = download_model(model_key)

    # Summary
    print("\n" + "=" * 60)
    print("Download Summary")
    print("=" * 60)
    for model_key, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {model_key:20} [{status}]")

    # Exit code
    if all(results.values()):
        print("\nAll models downloaded successfully!")
        sys.exit(0)
    else:
        print("\nSome downloads failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
