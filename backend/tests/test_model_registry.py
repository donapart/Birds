"""
Tests for model registry and consensus computation.
"""
import pytest

from app.models.base import ModelOutput, PredictionResult
from app.services.model_registry import ModelRegistry


class TestModelRegistry:
    """Tests for ModelRegistry class."""

    def test_init(self):
        """Test registry initialization."""
        registry = ModelRegistry()
        assert registry.models == {}

    def test_list_models_empty(self):
        """Test listing models when none are loaded."""
        registry = ModelRegistry()
        assert registry.list_models() == []

    def test_get_model_not_found(self):
        """Test getting non-existent model."""
        registry = ModelRegistry()
        assert registry.get_model("nonexistent") is None


class TestConsensusComputation:
    """Tests for consensus computation methods."""

    @pytest.fixture
    def model_outputs_agree(self):
        """Create model outputs where models agree."""
        return [
            ModelOutput(
                model_name="model_a",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.9,
                        rank=1
                    ),
                ],
                inference_time_ms=50
            ),
            ModelOutput(
                model_name="model_b",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.85,
                        rank=1
                    ),
                ],
                inference_time_ms=60
            ),
        ]

    @pytest.fixture
    def model_outputs_disagree(self):
        """Create model outputs where models disagree."""
        return [
            ModelOutput(
                model_name="model_a",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.9,
                        rank=1
                    ),
                ],
                inference_time_ms=50
            ),
            ModelOutput(
                model_name="model_b",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="robin",
                        species_scientific="Erithacus rubecula",
                        species_common="European Robin",
                        confidence=0.7,
                        rank=1
                    ),
                ],
                inference_time_ms=60
            ),
        ]

    def test_consensus_empty_outputs(self):
        """Test consensus with no model outputs."""
        result = ModelRegistry.compute_consensus([], method="weighted_average")
        assert result["species_common"] == "No prediction"
        assert result["confidence"] == 0.0
        assert result["agreement_count"] == 0
        assert result["total_models"] == 0

    def test_consensus_weighted_average_agree(self, model_outputs_agree):
        """Test weighted average consensus when models agree."""
        result = ModelRegistry.compute_consensus(
            model_outputs_agree,
            method="weighted_average"
        )

        assert result["species_common"] == "Eurasian Blackbird"
        assert result["confidence"] == pytest.approx(0.875, rel=0.01)  # avg of 0.9 and 0.85
        assert result["agreement_count"] == 2
        assert result["total_models"] == 2
        assert result["method"] == "weighted_average"

    def test_consensus_weighted_average_disagree(self, model_outputs_disagree):
        """Test weighted average consensus when models disagree."""
        result = ModelRegistry.compute_consensus(
            model_outputs_disagree,
            method="weighted_average"
        )

        # Blackbird has higher score (0.9) vs Robin (0.7)
        assert result["species_common"] == "Eurasian Blackbird"
        assert result["agreement_count"] == 1
        assert result["total_models"] == 2

    def test_consensus_majority_vote_agree(self, model_outputs_agree):
        """Test majority vote consensus when models agree."""
        result = ModelRegistry.compute_consensus(
            model_outputs_agree,
            method="majority_vote"
        )

        assert result["species_common"] == "Eurasian Blackbird"
        assert result["agreement_count"] == 2
        assert result["method"] == "majority_vote"

    def test_consensus_majority_vote_disagree(self, model_outputs_disagree):
        """Test majority vote consensus when models disagree."""
        result = ModelRegistry.compute_consensus(
            model_outputs_disagree,
            method="majority_vote"
        )

        # With 50/50 split, picks one of them
        assert result["species_common"] in ["Eurasian Blackbird", "European Robin"]
        assert result["agreement_count"] == 1
        assert result["total_models"] == 2

    def test_consensus_max_confidence(self, model_outputs_disagree):
        """Test max confidence consensus."""
        result = ModelRegistry.compute_consensus(
            model_outputs_disagree,
            method="max_confidence"
        )

        # Blackbird has 0.9 confidence vs Robin's 0.7
        assert result["species_common"] == "Eurasian Blackbird"
        assert result["confidence"] == 0.9
        assert result["method"] == "max_confidence"

    def test_consensus_three_models(self):
        """Test consensus with three models."""
        outputs = [
            ModelOutput(
                model_name="model_a",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.8,
                        rank=1
                    ),
                ],
                inference_time_ms=50
            ),
            ModelOutput(
                model_name="model_b",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.75,
                        rank=1
                    ),
                ],
                inference_time_ms=60
            ),
            ModelOutput(
                model_name="model_c",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="robin",
                        species_scientific="Erithacus rubecula",
                        species_common="European Robin",
                        confidence=0.9,
                        rank=1
                    ),
                ],
                inference_time_ms=55
            ),
        ]

        # Majority vote: 2 models say Blackbird
        result = ModelRegistry.compute_consensus(outputs, method="majority_vote")
        assert result["species_common"] == "Eurasian Blackbird"
        assert result["agreement_count"] == 2
        assert result["total_models"] == 3

    def test_consensus_model_with_no_predictions(self):
        """Test consensus when a model has no predictions."""
        outputs = [
            ModelOutput(
                model_name="model_a",
                model_version="1.0",
                predictions=[
                    PredictionResult(
                        species_code="blackbird",
                        species_scientific="Turdus merula",
                        species_common="Eurasian Blackbird",
                        confidence=0.8,
                        rank=1
                    ),
                ],
                inference_time_ms=50
            ),
            ModelOutput(
                model_name="model_b",
                model_version="1.0",
                predictions=[],  # No predictions
                inference_time_ms=60
            ),
        ]

        result = ModelRegistry.compute_consensus(outputs, method="weighted_average")
        assert result["species_common"] == "Eurasian Blackbird"
        assert result["agreement_count"] == 1
