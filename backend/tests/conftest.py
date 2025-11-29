"""
Pytest configuration and fixtures for BirdSound tests.
"""
import asyncio
import base64
import os
from datetime import datetime
from typing import AsyncGenerator, Generator

import numpy as np
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport

# Set test environment
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/birdsound_test"
os.environ["DEBUG"] = "true"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def app():
    """Create FastAPI application for testing."""
    from app.main import app
    return app


@pytest.fixture
def client(app) -> TestClient:
    """Create synchronous test client."""
    return TestClient(app)


@pytest.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    """Create async test client."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        yield client


@pytest.fixture
def sample_audio_pcm16() -> bytes:
    """Generate sample PCM16 audio data (3 seconds at 16kHz)."""
    sample_rate = 16000
    duration = 3.0
    samples = int(sample_rate * duration)

    # Generate a simple sine wave (440 Hz)
    t = np.linspace(0, duration, samples)
    audio = np.sin(2 * np.pi * 440 * t) * 0.5

    # Convert to 16-bit PCM
    audio_int16 = (audio * 32767).astype(np.int16)
    return audio_int16.tobytes()


@pytest.fixture
def sample_audio_base64(sample_audio_pcm16) -> str:
    """Get base64-encoded sample audio."""
    return base64.b64encode(sample_audio_pcm16).decode()


@pytest.fixture
def sample_prediction_request(sample_audio_base64) -> dict:
    """Create a sample prediction request payload."""
    return {
        "device_id": "test-device-001",
        "timestamp_utc": datetime.utcnow().isoformat() + "Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 16000,
        "audio_format": "pcm16_le",
        "audio_base64": sample_audio_base64,
    }


@pytest.fixture
def sample_audio_numpy() -> np.ndarray:
    """Generate sample audio as numpy array."""
    sample_rate = 48000  # BirdNET sample rate
    duration = 3.0
    samples = int(sample_rate * duration)

    # Generate bird-like chirp (frequency sweep)
    t = np.linspace(0, duration, samples)
    freq = 2000 + 1000 * np.sin(2 * np.pi * 5 * t)  # Chirp
    audio = np.sin(2 * np.pi * freq * t) * 0.3

    # Add some noise
    audio += np.random.normal(0, 0.05, samples)

    return audio.astype(np.float32)


# Mock models for testing
@pytest.fixture
def mock_model_output():
    """Create mock model output."""
    from app.models.base import ModelOutput, PredictionResult

    return ModelOutput(
        model_name="test_model",
        model_version="1.0",
        predictions=[
            PredictionResult(
                species_code="turdus_merula",
                species_scientific="Turdus merula",
                species_common="Eurasian Blackbird",
                confidence=0.85,
                rank=1
            ),
            PredictionResult(
                species_code="erithacus_rubecula",
                species_scientific="Erithacus rubecula",
                species_common="European Robin",
                confidence=0.10,
                rank=2
            ),
        ],
        inference_time_ms=50
    )
