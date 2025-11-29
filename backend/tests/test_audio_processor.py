"""
Tests for audio processing service.
"""
import base64

import numpy as np
import pytest

from app.services.audio_processor import AudioProcessor, audio_processor


class TestAudioProcessor:
    """Tests for AudioProcessor class."""

    def test_default_initialization(self):
        """Test default processor initialization."""
        processor = AudioProcessor()
        assert processor.target_sample_rate == 48000
        assert processor.target_duration_sec == 3.0
        assert processor.target_samples == 144000

    def test_custom_initialization(self):
        """Test custom processor initialization."""
        processor = AudioProcessor(
            target_sample_rate=16000,
            target_duration_sec=5.0
        )
        assert processor.target_sample_rate == 16000
        assert processor.target_duration_sec == 5.0
        assert processor.target_samples == 80000

    def test_decode_pcm16(self):
        """Test PCM16 decoding."""
        processor = AudioProcessor()

        # Create test audio
        samples = np.array([0, 16384, 32767, -32768, -16384], dtype=np.int16)
        audio_bytes = samples.tobytes()
        audio_base64 = base64.b64encode(audio_bytes).decode()

        # Decode
        decoded = processor.decode_base64_audio(audio_base64, "pcm16_le", 16000)

        # Check values are normalized
        assert decoded.dtype == np.float32
        assert np.max(decoded) <= 1.0
        assert np.min(decoded) >= -1.0

    def test_normalize(self):
        """Test audio normalization."""
        processor = AudioProcessor()

        # Create quiet audio
        audio = np.array([0.1, 0.2, -0.3, 0.15], dtype=np.float32)
        normalized = processor.normalize(audio)

        # Peak should be at 1.0 or -1.0
        assert np.abs(np.max(np.abs(normalized)) - 1.0) < 0.001

    def test_normalize_silent(self):
        """Test normalization of silent audio."""
        processor = AudioProcessor()
        audio = np.zeros(100, dtype=np.float32)
        normalized = processor.normalize(audio)
        # Should not crash, should return zeros
        assert np.all(normalized == 0)

    def test_pad_or_trim_longer(self):
        """Test trimming audio that's too long."""
        processor = AudioProcessor(target_sample_rate=16000, target_duration_sec=1.0)

        # Create 2 seconds of audio at 16kHz
        audio = np.random.randn(32000).astype(np.float32)
        result = processor.pad_or_trim(audio)

        assert len(result) == 16000

    def test_pad_or_trim_shorter(self):
        """Test padding audio that's too short."""
        processor = AudioProcessor(target_sample_rate=16000, target_duration_sec=1.0)

        # Create 0.5 seconds of audio at 16kHz
        audio = np.random.randn(8000).astype(np.float32)
        result = processor.pad_or_trim(audio)

        assert len(result) == 16000

    def test_pad_or_trim_exact(self):
        """Test audio that's already the right length."""
        processor = AudioProcessor(target_sample_rate=16000, target_duration_sec=1.0)

        audio = np.random.randn(16000).astype(np.float32)
        result = processor.pad_or_trim(audio)

        assert len(result) == 16000
        assert np.array_equal(result, audio)

    def test_detect_silence_quiet(self):
        """Test silence detection on quiet audio."""
        processor = AudioProcessor()

        # Very quiet audio
        audio = np.random.randn(1000).astype(np.float32) * 0.0001
        assert processor.detect_silence(audio, threshold_db=-40.0) is True

    def test_detect_silence_loud(self):
        """Test silence detection on loud audio."""
        processor = AudioProcessor()

        # Loud audio
        audio = np.random.randn(1000).astype(np.float32) * 0.5
        assert processor.detect_silence(audio, threshold_db=-40.0) is False

    def test_resample_same_rate(self):
        """Test resampling when rates are the same."""
        processor = AudioProcessor()

        audio = np.random.randn(1000).astype(np.float32)
        result = processor.resample(audio, 16000, 16000)

        assert len(result) == len(audio)
        assert np.array_equal(result, audio)

    def test_resample_upsample(self):
        """Test upsampling."""
        processor = AudioProcessor()

        # 1 second at 16kHz -> 1 second at 48kHz
        audio = np.random.randn(16000).astype(np.float32)
        result = processor.resample(audio, 16000, 48000)

        # Should be roughly 3x the samples
        assert len(result) == pytest.approx(48000, rel=0.01)

    def test_resample_downsample(self):
        """Test downsampling."""
        processor = AudioProcessor()

        # 1 second at 48kHz -> 1 second at 16kHz
        audio = np.random.randn(48000).astype(np.float32)
        result = processor.resample(audio, 48000, 16000)

        # Should be roughly 1/3 the samples
        assert len(result) == pytest.approx(16000, rel=0.01)

    def test_prepare_for_model(self, sample_audio_base64):
        """Test full preprocessing pipeline."""
        processor = AudioProcessor(target_sample_rate=48000, target_duration_sec=3.0)

        result = processor.prepare_for_model(
            audio_base64=sample_audio_base64,
            audio_format="pcm16_le",
            source_sample_rate=16000,
            normalize=True
        )

        # Should be exactly target length
        assert len(result) == processor.target_samples
        # Should be normalized
        assert np.max(np.abs(result)) <= 1.0

    def test_global_instance(self):
        """Test global audio_processor instance."""
        assert audio_processor is not None
        assert isinstance(audio_processor, AudioProcessor)
