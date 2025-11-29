"""
Model registry for managing multiple ML models.
"""
import logging
from typing import Dict, List, Optional
import asyncio

import numpy as np

from app.models.base import BaseBirdModel, ModelOutput, PredictionResult
from app.models.birdnet import BirdNETModel
from app.models.huggingface import HuggingFaceModel, DimaBirdModel
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ModelRegistry:
    """
    Registry for bird sound classification models.

    Manages loading, unloading, and inference across multiple models.
    Provides consensus voting across model predictions.
    """

    def __init__(self):
        """Initialize empty model registry."""
        self.models: Dict[str, BaseBirdModel] = {}

    async def load_models(self) -> None:
        """Load all configured models."""
        models_to_load = [
            BirdNETModel(
                top_n=settings.TOP_N_PREDICTIONS,
                min_confidence=settings.MIN_CONFIDENCE_THRESHOLD
            ),
            HuggingFaceModel(
                model_name_or_path=settings.HF_MODEL_NAME,
                top_n=settings.TOP_N_PREDICTIONS,
                min_confidence=settings.MIN_CONFIDENCE_THRESHOLD
            ),
        ]

        # Load models concurrently
        tasks = [model.load() for model in models_to_load]
        await asyncio.gather(*tasks, return_exceptions=True)

        # Register successfully loaded models
        for model in models_to_load:
            if model.is_loaded:
                self.models[model.model_name] = model
                logger.info(f"Registered model: {model.model_name}")
            else:
                logger.warning(f"Model {model.model_name} failed to load")

    async def unload_models(self) -> None:
        """Unload all models."""
        tasks = [model.unload() for model in self.models.values()]
        await asyncio.gather(*tasks, return_exceptions=True)
        self.models.clear()

    def get_model(self, name: str) -> Optional[BaseBirdModel]:
        """Get a model by name."""
        return self.models.get(name)

    def list_models(self) -> List[str]:
        """List all available model names."""
        return list(self.models.keys())

    async def predict_all(
        self,
        audio: np.ndarray,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        model_names: Optional[List[str]] = None
    ) -> List[ModelOutput]:
        """
        Run prediction on all models (or specified subset).

        Args:
            audio: Preprocessed audio array
            lat: Optional latitude
            lon: Optional longitude
            model_names: Specific models to use (None = all)

        Returns:
            List of ModelOutput from each model
        """
        if model_names:
            models = [
                self.models[name]
                for name in model_names
                if name in self.models
            ]
        else:
            models = list(self.models.values())

        if not models:
            logger.warning("No models available for prediction")
            return []

        # Run predictions concurrently
        tasks = [model.predict(audio, lat, lon) for model in models]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out errors
        outputs = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Model {models[i].model_name} failed: {result}")
            elif isinstance(result, ModelOutput):
                outputs.append(result)

        return outputs

    @staticmethod
    def compute_consensus(
        model_outputs: List[ModelOutput],
        method: str = "weighted_average"
    ) -> Dict:
        """
        Compute consensus prediction across models.

        Methods:
        - "majority_vote": Most common top-1 prediction
        - "weighted_average": Average confidence weighted by model confidence
        - "max_confidence": Highest confidence prediction across all models

        Args:
            model_outputs: List of ModelOutput from different models
            method: Consensus method to use

        Returns:
            Dict with consensus prediction info
        """
        if not model_outputs:
            return {
                "species_code": None,
                "species_scientific": None,
                "species_common": "No prediction",
                "confidence": 0.0,
                "method": method,
                "agreement_count": 0,
                "total_models": 0
            }

        # Collect all top-1 predictions
        top_predictions = []
        for output in model_outputs:
            if output.predictions:
                pred = output.predictions[0]
                top_predictions.append({
                    "model": output.model_name,
                    "species": pred.species_common,
                    "species_code": pred.species_code,
                    "species_scientific": pred.species_scientific,
                    "confidence": pred.confidence
                })

        if not top_predictions:
            return {
                "species_code": None,
                "species_scientific": None,
                "species_common": "No prediction",
                "confidence": 0.0,
                "method": method,
                "agreement_count": 0,
                "total_models": len(model_outputs)
            }

        if method == "majority_vote":
            return ModelRegistry._majority_vote(top_predictions, len(model_outputs))
        elif method == "max_confidence":
            return ModelRegistry._max_confidence(top_predictions, len(model_outputs))
        else:  # weighted_average
            return ModelRegistry._weighted_average(top_predictions, len(model_outputs))

    @staticmethod
    def _majority_vote(predictions: List[Dict], total_models: int) -> Dict:
        """Simple majority vote on species name."""
        from collections import Counter

        species_counts = Counter(p["species"] for p in predictions)
        winner, count = species_counts.most_common(1)[0]

        # Find prediction with this species
        winner_pred = next(p for p in predictions if p["species"] == winner)

        # Average confidence of agreeing models
        agreeing = [p for p in predictions if p["species"] == winner]
        avg_confidence = sum(p["confidence"] for p in agreeing) / len(agreeing)

        return {
            "species_code": winner_pred["species_code"],
            "species_scientific": winner_pred["species_scientific"],
            "species_common": winner,
            "confidence": avg_confidence,
            "method": "majority_vote",
            "agreement_count": count,
            "total_models": total_models
        }

    @staticmethod
    def _weighted_average(predictions: List[Dict], total_models: int) -> Dict:
        """Weighted average by confidence."""
        from collections import defaultdict

        # Aggregate scores per species
        species_scores = defaultdict(lambda: {"score": 0.0, "count": 0, "pred": None})

        for p in predictions:
            key = p["species"]
            species_scores[key]["score"] += p["confidence"]
            species_scores[key]["count"] += 1
            if species_scores[key]["pred"] is None:
                species_scores[key]["pred"] = p

        # Find highest scoring species
        winner = max(species_scores.items(), key=lambda x: x[1]["score"])
        winner_species = winner[0]
        winner_data = winner[1]

        return {
            "species_code": winner_data["pred"]["species_code"],
            "species_scientific": winner_data["pred"]["species_scientific"],
            "species_common": winner_species,
            "confidence": winner_data["score"] / winner_data["count"],
            "method": "weighted_average",
            "agreement_count": winner_data["count"],
            "total_models": total_models
        }

    @staticmethod
    def _max_confidence(predictions: List[Dict], total_models: int) -> Dict:
        """Simply take highest confidence prediction."""
        winner = max(predictions, key=lambda p: p["confidence"])

        # Count how many models agree
        agreement = sum(1 for p in predictions if p["species"] == winner["species"])

        return {
            "species_code": winner["species_code"],
            "species_scientific": winner["species_scientific"],
            "species_common": winner["species"],
            "confidence": winner["confidence"],
            "method": "max_confidence",
            "agreement_count": agreement,
            "total_models": total_models
        }


# Global registry instance
model_registry = ModelRegistry()
