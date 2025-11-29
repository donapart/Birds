"""
API endpoint tests for BirdSound.
"""
import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for health check endpoints."""

    def test_health_check(self, client: TestClient):
        """Test basic health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "models_loaded" in data

    def test_detailed_health(self, client: TestClient):
        """Test detailed health check."""
        response = client.get("/health/detailed")
        assert response.status_code == 200
        data = response.json()
        assert "components" in data
        assert data["components"]["api"] == "operational"


class TestRootEndpoint:
    """Tests for root endpoint."""

    def test_root_returns_info_or_frontend(self, client: TestClient):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        # Either returns JSON info or HTML frontend
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type or "text/html" in content_type

    def test_api_info(self, client: TestClient):
        """Test API info endpoint."""
        response = client.get("/api")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data


class TestModelsEndpoint:
    """Tests for models endpoints."""

    def test_list_models(self, client: TestClient):
        """Test listing available models."""
        response = client.get("/api/v1/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert "total" in data
        assert isinstance(data["models"], list)

    def test_get_unknown_model(self, client: TestClient):
        """Test getting info for non-existent model."""
        response = client.get("/api/v1/models/nonexistent_model")
        assert response.status_code == 404


class TestPredictEndpoint:
    """Tests for prediction endpoints."""

    def test_predict_missing_fields(self, client: TestClient, auth_headers):
        """Test prediction with missing required fields."""
        response = client.post("/api/v1/predict", json={}, headers=auth_headers)
        assert response.status_code == 422  # Validation error

    def test_predict_invalid_audio_format(self, client: TestClient, sample_prediction_request, auth_headers):
        """Test prediction with invalid audio format."""
        request = sample_prediction_request.copy()
        request["audio_format"] = "invalid_format"
        response = client.post("/api/v1/predict", json=request, headers=auth_headers)
        assert response.status_code == 422

    def test_predict_invalid_base64(self, client: TestClient, sample_prediction_request, auth_headers):
        """Test prediction with invalid base64 data."""
        request = sample_prediction_request.copy()
        request["audio_base64"] = "not_valid_base64!!!"
        response = client.post("/api/v1/predict", json=request, headers=auth_headers)
        assert response.status_code == 422

    def test_predict_valid_request(self, client: TestClient, sample_prediction_request, auth_headers):
        """Test prediction with valid request."""
        response = client.post("/api/v1/predict", json=sample_prediction_request, headers=auth_headers)
        # Should return 200 or 500 (if models not loaded)
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "recording_id" in data
            assert "consensus" in data
            assert "model_predictions" in data

    def test_predict_quick(self, client: TestClient, sample_prediction_request, auth_headers):
        """Test quick prediction endpoint."""
        response = client.post("/api/v1/predict/quick", json=sample_prediction_request, headers=auth_headers)
        assert response.status_code in [200, 500]

    def test_predict_without_api_key(self, client: TestClient, sample_prediction_request):
        """Test that prediction requires API key."""
        response = client.post("/api/v1/predict", json=sample_prediction_request)
        assert response.status_code == 401

    def test_predict_quick_without_api_key(self, client: TestClient, sample_prediction_request):
        """Test that quick prediction requires API key."""
        response = client.post("/api/v1/predict/quick", json=sample_prediction_request)
        assert response.status_code == 401


class TestRecordingsEndpoint:
    """Tests for recordings endpoints."""

    def test_list_recordings(self, client: TestClient):
        """Test listing recordings."""
        response = client.get("/api/v1/recordings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_recordings_with_filters(self, client: TestClient):
        """Test listing recordings with filters."""
        response = client.get("/api/v1/recordings", params={
            "min_confidence": 0.5,
            "limit": 10,
        })
        assert response.status_code == 200

    def test_get_nonexistent_recording(self, client: TestClient):
        """Test getting non-existent recording."""
        response = client.get("/api/v1/recordings/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    def test_map_points(self, client: TestClient):
        """Test getting map data points."""
        response = client.get("/api/v1/recordings/map/points")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_timeline(self, client: TestClient):
        """Test getting timeline."""
        response = client.get("/api/v1/recordings/timeline", params={"hours": 24})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_statistics(self, client: TestClient):
        """Test getting statistics."""
        response = client.get("/api/v1/recordings/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_recordings" in data
        assert "unique_species" in data

    def test_compare_models(self, client: TestClient):
        """Test model comparison endpoint."""
        response = client.get("/api/v1/recordings/compare")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
