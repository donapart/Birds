"""
Bird sound classification models.

This module provides ML model implementations for bird sound classification:
- BaseBirdModel: Abstract base class for all models
- BirdNETModel: Stub/wrapper for BirdNET model
- HuggingFaceModel: HuggingFace transformers models
- DimaBirdModel: Specialized DimaBird model
"""

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult
from app.models.birdnet import BirdNETModel
from app.models.huggingface import HuggingFaceModel, DimaBirdModel
from app.models.perch_runtime import PerchRuntimeModel

__all__ = [
    "BaseBirdModel",
    "ModelOutput",
    "PredictionResult",
    "BirdNETModel",
    "HuggingFaceModel",
    "DimaBirdModel",
    "PerchRuntimeModel",
]
