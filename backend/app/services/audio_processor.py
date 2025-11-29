"""
Audio processing utilities.
Handles decoding, resampling, normalization for ML models.
"""
import base64
import io
import logging
from typing import Tuple, Optional

import numpy as np

logger = logging.getLogger(__name__)


class AudioProcessor:
    """
    Processes raw audio data for ML model inference.

    Handles:
    - Base64 decoding
    - Format conversion (PCM, WAV, OGG)
    - Resampling to target sample rate
    - Normalization
    - Chunking/windowing
    """

    def __init__(
        self,
        target_sample_rate: int = 48000,
        target_duration_sec: float = 3.0
    ):
        """
        Initialize audio processor.

        Args:
            target_sample_rate: Target sample rate for models (BirdNET uses 48kHz)
            target_duration_sec: Target audio duration in seconds
        """
        self.target_sample_rate = target_sample_rate
        self.target_duration_sec = target_duration_sec
        self.target_samples = int(target_sample_rate * target_duration_sec)

    def decode_base64_audio(
        self,
        audio_base64: str,
        audio_format: str,
        source_sample_rate: int
    ) -> np.ndarray:
        """
        Decode base64-encoded audio to numpy array.

        Args:
            audio_base64: Base64-encoded audio data
            audio_format: Format string (pcm16_le, wav, etc.)
            source_sample_rate: Sample rate of source audio

        Returns:
            Audio as float32 numpy array, normalized to [-1, 1]
        """
        try:
            raw_bytes = base64.b64decode(audio_base64)
        except Exception as e:
            raise ValueError(f"Failed to decode base64: {e}")

        if audio_format == "pcm16_le":
            audio = self._decode_pcm16(raw_bytes, little_endian=True)
        elif audio_format == "pcm16_be":
            audio = self._decode_pcm16(raw_bytes, little_endian=False)
        elif audio_format == "float32":
            audio = np.frombuffer(raw_bytes, dtype=np.float32)
        elif audio_format in ("wav", "ogg_opus", "mp3"):
            audio = self._decode_audio_file(raw_bytes, audio_format)
        else:
            raise ValueError(f"Unsupported audio format: {audio_format}")

        return audio

    def _decode_pcm16(self, raw_bytes: bytes, little_endian: bool = True) -> np.ndarray:
        """Decode 16-bit PCM to float32."""
        dtype = "<i2" if little_endian else ">i2"
        audio = np.frombuffer(raw_bytes, dtype=dtype).astype(np.float32)
        # Normalize to [-1, 1]
        audio = audio / 32768.0
        return audio

    def _decode_audio_file(self, raw_bytes: bytes, format: str) -> np.ndarray:
        """
        Decode audio file formats using soundfile or pydub.

        Note: This requires additional dependencies:
        - soundfile for WAV
        - pydub + ffmpeg for OGG/MP3
        """
        try:
            import soundfile as sf
            audio, sr = sf.read(io.BytesIO(raw_bytes))
            if len(audio.shape) > 1:
                audio = audio.mean(axis=1)  # Convert to mono
            return audio.astype(np.float32)
        except ImportError:
            logger.warning("soundfile not installed, trying pydub")

        try:
            from pydub import AudioSegment
            if format == "wav":
                seg = AudioSegment.from_wav(io.BytesIO(raw_bytes))
            elif format == "ogg_opus":
                seg = AudioSegment.from_ogg(io.BytesIO(raw_bytes))
            elif format == "mp3":
                seg = AudioSegment.from_mp3(io.BytesIO(raw_bytes))
            else:
                raise ValueError(f"Unsupported format for pydub: {format}")

            # Convert to mono
            seg = seg.set_channels(1)
            samples = np.array(seg.get_array_of_samples()).astype(np.float32)
            samples = samples / 32768.0
            return samples
        except ImportError:
            raise ImportError(
                "Neither soundfile nor pydub is installed. "
                "Install soundfile: pip install soundfile"
            )

    def resample(
        self,
        audio: np.ndarray,
        source_sr: int,
        target_sr: int
    ) -> np.ndarray:
        """
        Resample audio to target sample rate.

        Uses librosa if available, otherwise scipy.
        """
        if source_sr == target_sr:
            return audio

        try:
            import librosa
            return librosa.resample(
                audio,
                orig_sr=source_sr,
                target_sr=target_sr,
                res_type="kaiser_best"
            )
        except ImportError:
            pass

        try:
            from scipy import signal
            num_samples = int(len(audio) * target_sr / source_sr)
            return signal.resample(audio, num_samples).astype(np.float32)
        except ImportError:
            raise ImportError(
                "Neither librosa nor scipy is installed. "
                "Install one: pip install librosa or pip install scipy"
            )

    def normalize(self, audio: np.ndarray) -> np.ndarray:
        """
        Normalize audio to consistent volume level.

        Uses peak normalization to [-1, 1].
        """
        peak = np.abs(audio).max()
        if peak > 0:
            audio = audio / peak
        return audio

    def pad_or_trim(
        self,
        audio: np.ndarray,
        target_samples: Optional[int] = None
    ) -> np.ndarray:
        """
        Pad with zeros or trim audio to target length.

        Args:
            audio: Input audio array
            target_samples: Target number of samples (uses default if None)

        Returns:
            Audio array of exact target length
        """
        if target_samples is None:
            target_samples = self.target_samples

        if len(audio) > target_samples:
            # Trim from center
            start = (len(audio) - target_samples) // 2
            return audio[start:start + target_samples]
        elif len(audio) < target_samples:
            # Pad with zeros
            padding = target_samples - len(audio)
            pad_left = padding // 2
            pad_right = padding - pad_left
            return np.pad(audio, (pad_left, pad_right), mode="constant")
        return audio

    def prepare_for_model(
        self,
        audio_base64: str,
        audio_format: str,
        source_sample_rate: int,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Full pipeline to prepare audio for model inference.

        Args:
            audio_base64: Base64-encoded audio
            audio_format: Source format
            source_sample_rate: Source sample rate
            normalize: Whether to normalize volume

        Returns:
            Processed audio ready for model inference
        """
        # Decode
        audio = self.decode_base64_audio(audio_base64, audio_format, source_sample_rate)

        # Resample
        audio = self.resample(audio, source_sample_rate, self.target_sample_rate)

        # Normalize
        if normalize:
            audio = self.normalize(audio)

        # Pad/trim to exact length
        audio = self.pad_or_trim(audio)

        return audio

    def compute_spectrogram(
        self,
        audio: np.ndarray,
        n_fft: int = 2048,
        hop_length: int = 512,
        n_mels: int = 128
    ) -> np.ndarray:
        """
        Compute mel spectrogram for visualization or certain models.

        Args:
            audio: Input audio array
            n_fft: FFT window size
            hop_length: Hop length between frames
            n_mels: Number of mel bands

        Returns:
            Mel spectrogram as numpy array
        """
        try:
            import librosa
            mel_spec = librosa.feature.melspectrogram(
                y=audio,
                sr=self.target_sample_rate,
                n_fft=n_fft,
                hop_length=hop_length,
                n_mels=n_mels
            )
            # Convert to dB scale
            mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
            return mel_spec_db
        except ImportError:
            raise ImportError("librosa is required for spectrogram computation")

    def detect_silence(
        self,
        audio: np.ndarray,
        threshold_db: float = -40.0
    ) -> bool:
        """
        Check if audio is mostly silence.

        Args:
            audio: Input audio array
            threshold_db: dB threshold below which is considered silence

        Returns:
            True if audio is mostly silent
        """
        rms = np.sqrt(np.mean(audio ** 2))
        db = 20 * np.log10(rms + 1e-10)
        return bool(db < threshold_db)


# Global instance
audio_processor = AudioProcessor()
