"""
Audio Enhancement Service for Bird Sound Recognition.

Provides optional preprocessing to improve bird call detection:
- Bandpass Filter: Focuses on bird vocalization frequencies (1-8 kHz)
- Noise Reduction: Removes constant background noise
- Auto-Gain: Normalizes volume levels
- Spectral Gating: Removes quiet background sounds

All features are individually toggleable via API parameters.
"""
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class EnhancementSettings:
    """Settings for audio enhancement features."""
    
    # Bandpass Filter (bird frequencies: 1-8 kHz)
    bandpass_enabled: bool = False
    bandpass_low_freq: int = 1000   # Hz - lower cutoff
    bandpass_high_freq: int = 8000  # Hz - upper cutoff
    bandpass_order: int = 5         # Filter order
    
    # Noise Reduction
    noise_reduction_enabled: bool = False
    noise_reduction_strength: float = 1.0  # 0.0 to 2.0
    noise_reduction_stationary: bool = True  # Assume stationary noise
    
    # Auto-Gain (volume normalization)
    auto_gain_enabled: bool = False
    auto_gain_target_db: float = -3.0  # Target peak level in dB
    
    # Spectral Gating (remove quiet sounds)
    spectral_gate_enabled: bool = False
    spectral_gate_threshold_db: float = -40.0  # Gate threshold
    
    # High-pass filter (remove very low rumble)
    highpass_enabled: bool = False
    highpass_freq: int = 200  # Hz - remove below this
    
    @classmethod
    def from_dict(cls, data: dict) -> "EnhancementSettings":
        """Create settings from dictionary (e.g., from API request)."""
        return cls(
            bandpass_enabled=data.get("bandpass_enabled", False),
            bandpass_low_freq=data.get("bandpass_low_freq", 1000),
            bandpass_high_freq=data.get("bandpass_high_freq", 8000),
            bandpass_order=data.get("bandpass_order", 5),
            noise_reduction_enabled=data.get("noise_reduction_enabled", False),
            noise_reduction_strength=data.get("noise_reduction_strength", 1.0),
            noise_reduction_stationary=data.get("noise_reduction_stationary", True),
            auto_gain_enabled=data.get("auto_gain_enabled", False),
            auto_gain_target_db=data.get("auto_gain_target_db", -3.0),
            spectral_gate_enabled=data.get("spectral_gate_enabled", False),
            spectral_gate_threshold_db=data.get("spectral_gate_threshold_db", -40.0),
            highpass_enabled=data.get("highpass_enabled", False),
            highpass_freq=data.get("highpass_freq", 200),
        )
    
    def to_dict(self) -> dict:
        """Convert settings to dictionary."""
        return {
            "bandpass_enabled": self.bandpass_enabled,
            "bandpass_low_freq": self.bandpass_low_freq,
            "bandpass_high_freq": self.bandpass_high_freq,
            "bandpass_order": self.bandpass_order,
            "noise_reduction_enabled": self.noise_reduction_enabled,
            "noise_reduction_strength": self.noise_reduction_strength,
            "noise_reduction_stationary": self.noise_reduction_stationary,
            "auto_gain_enabled": self.auto_gain_enabled,
            "auto_gain_target_db": self.auto_gain_target_db,
            "spectral_gate_enabled": self.spectral_gate_enabled,
            "spectral_gate_threshold_db": self.spectral_gate_threshold_db,
            "highpass_enabled": self.highpass_enabled,
            "highpass_freq": self.highpass_freq,
        }


class AudioEnhancer:
    """
    Audio enhancement processor for bird sound recognition.
    
    All enhancement features can be enabled/disabled individually.
    Processing order:
    1. High-pass filter (remove rumble)
    2. Bandpass filter (focus on bird frequencies)
    3. Noise reduction
    4. Spectral gating
    5. Auto-gain normalization
    """
    
    def __init__(self):
        self._noisereduce_available = None
        self._scipy_available = None
    
    def _check_scipy(self) -> bool:
        """Check if scipy is available."""
        if self._scipy_available is None:
            try:
                from scipy import signal
                self._scipy_available = True
            except ImportError:
                self._scipy_available = False
                logger.warning("scipy not available - filters disabled")
        return self._scipy_available
    
    def _check_noisereduce(self) -> bool:
        """Check if noisereduce library is available."""
        if self._noisereduce_available is None:
            try:
                import noisereduce
                self._noisereduce_available = True
            except ImportError:
                self._noisereduce_available = False
                logger.warning("noisereduce not available - noise reduction disabled")
        return self._noisereduce_available
    
    def enhance(
        self,
        audio: np.ndarray,
        sample_rate: int,
        settings: Optional[EnhancementSettings] = None
    ) -> Tuple[np.ndarray, dict]:
        """
        Apply audio enhancements based on settings.
        
        Args:
            audio: Input audio as float32 numpy array [-1, 1]
            sample_rate: Sample rate in Hz
            settings: Enhancement settings (uses defaults if None)
            
        Returns:
            Tuple of (enhanced_audio, applied_enhancements_dict)
        """
        if settings is None:
            settings = EnhancementSettings()
        
        applied = {}
        enhanced = audio.copy().astype(np.float32)
        
        # 1. High-pass filter (remove low rumble)
        if settings.highpass_enabled:
            enhanced, success = self._apply_highpass(
                enhanced, sample_rate, settings.highpass_freq
            )
            applied["highpass"] = {
                "enabled": True,
                "applied": success,
                "freq": settings.highpass_freq
            }
        
        # 2. Bandpass filter (bird frequencies)
        if settings.bandpass_enabled:
            enhanced, success = self._apply_bandpass(
                enhanced,
                sample_rate,
                settings.bandpass_low_freq,
                settings.bandpass_high_freq,
                settings.bandpass_order
            )
            applied["bandpass"] = {
                "enabled": True,
                "applied": success,
                "low_freq": settings.bandpass_low_freq,
                "high_freq": settings.bandpass_high_freq
            }
        
        # 3. Noise reduction
        if settings.noise_reduction_enabled:
            enhanced, success = self._apply_noise_reduction(
                enhanced,
                sample_rate,
                settings.noise_reduction_strength,
                settings.noise_reduction_stationary
            )
            applied["noise_reduction"] = {
                "enabled": True,
                "applied": success,
                "strength": settings.noise_reduction_strength
            }
        
        # 4. Spectral gating
        if settings.spectral_gate_enabled:
            enhanced, success = self._apply_spectral_gate(
                enhanced,
                sample_rate,
                settings.spectral_gate_threshold_db
            )
            applied["spectral_gate"] = {
                "enabled": True,
                "applied": success,
                "threshold_db": settings.spectral_gate_threshold_db
            }
        
        # 5. Auto-gain normalization
        if settings.auto_gain_enabled:
            enhanced, success = self._apply_auto_gain(
                enhanced,
                settings.auto_gain_target_db
            )
            applied["auto_gain"] = {
                "enabled": True,
                "applied": success,
                "target_db": settings.auto_gain_target_db
            }
        
        return enhanced, applied
    
    def _apply_highpass(
        self,
        audio: np.ndarray,
        sample_rate: int,
        cutoff_freq: int
    ) -> Tuple[np.ndarray, bool]:
        """Apply high-pass filter to remove low-frequency rumble."""
        if not self._check_scipy():
            return audio, False
        
        try:
            from scipy import signal
            
            # Nyquist frequency
            nyquist = sample_rate / 2
            
            # Ensure cutoff is valid
            if cutoff_freq >= nyquist:
                logger.warning(f"Highpass cutoff {cutoff_freq} >= Nyquist {nyquist}")
                return audio, False
            
            # Design Butterworth high-pass filter
            normalized_cutoff = cutoff_freq / nyquist
            b, a = signal.butter(4, normalized_cutoff, btype='high')
            
            # Apply filter
            filtered = signal.filtfilt(b, a, audio).astype(np.float32)
            
            logger.debug(f"Applied highpass filter at {cutoff_freq} Hz")
            return filtered, True
            
        except Exception as e:
            logger.error(f"Highpass filter failed: {e}")
            return audio, False
    
    def _apply_bandpass(
        self,
        audio: np.ndarray,
        sample_rate: int,
        low_freq: int,
        high_freq: int,
        order: int
    ) -> Tuple[np.ndarray, bool]:
        """
        Apply bandpass filter to focus on bird vocalization frequencies.
        
        Most bird calls are in the 1-8 kHz range:
        - Low-pitched calls: 1-2 kHz (owls, pigeons)
        - Mid-range calls: 2-5 kHz (most songbirds)
        - High-pitched calls: 5-8 kHz (some warblers, finches)
        """
        if not self._check_scipy():
            return audio, False
        
        try:
            from scipy import signal
            
            # Nyquist frequency
            nyquist = sample_rate / 2
            
            # Ensure frequencies are valid
            if high_freq >= nyquist:
                high_freq = int(nyquist * 0.95)
                logger.warning(f"Adjusted bandpass high to {high_freq} Hz")
            
            if low_freq >= high_freq:
                logger.warning(f"Invalid bandpass: {low_freq} >= {high_freq}")
                return audio, False
            
            # Normalized frequencies
            low_normalized = low_freq / nyquist
            high_normalized = high_freq / nyquist
            
            # Design Butterworth bandpass filter
            b, a = signal.butter(order, [low_normalized, high_normalized], btype='band')
            
            # Apply filter (filtfilt for zero-phase)
            filtered = signal.filtfilt(b, a, audio).astype(np.float32)
            
            logger.debug(f"Applied bandpass filter: {low_freq}-{high_freq} Hz")
            return filtered, True
            
        except Exception as e:
            logger.error(f"Bandpass filter failed: {e}")
            return audio, False
    
    def _apply_noise_reduction(
        self,
        audio: np.ndarray,
        sample_rate: int,
        strength: float,
        stationary: bool
    ) -> Tuple[np.ndarray, bool]:
        """
        Apply noise reduction using spectral gating.
        
        Uses the noisereduce library which implements:
        - Spectral noise estimation
        - Spectral subtraction
        - Optional stationary noise assumption
        """
        if not self._check_noisereduce():
            return audio, False
        
        try:
            import noisereduce as nr
            
            # Apply noise reduction
            reduced = nr.reduce_noise(
                y=audio,
                sr=sample_rate,
                stationary=stationary,
                prop_decrease=min(1.0, strength),  # Clamp to valid range
                n_std_thresh_stationary=1.5,
                use_torch=False,  # Use numpy for compatibility
            )
            
            logger.debug(f"Applied noise reduction (strength={strength})")
            return reduced.astype(np.float32), True
            
        except Exception as e:
            logger.error(f"Noise reduction failed: {e}")
            return audio, False
    
    def _apply_spectral_gate(
        self,
        audio: np.ndarray,
        sample_rate: int,
        threshold_db: float
    ) -> Tuple[np.ndarray, bool]:
        """
        Apply spectral gating to remove quiet background sounds.
        
        This is a simpler alternative to full noise reduction:
        - Sounds below threshold are attenuated
        - Preserves loud bird calls
        - Removes constant low-level noise
        """
        try:
            # Convert threshold from dB to linear
            threshold_linear = 10 ** (threshold_db / 20)
            
            # Calculate running RMS (simple envelope follower)
            frame_size = int(sample_rate * 0.02)  # 20ms frames
            hop_size = frame_size // 4
            
            # Compute envelope
            envelope = np.zeros_like(audio)
            for i in range(0, len(audio) - frame_size, hop_size):
                frame = audio[i:i + frame_size]
                rms = np.sqrt(np.mean(frame ** 2))
                envelope[i:i + frame_size] = np.maximum(envelope[i:i + frame_size], rms)
            
            # Apply soft gate
            gate = np.clip(envelope / threshold_linear, 0, 1)
            
            # Smooth the gate to avoid clicks
            from scipy.ndimage import gaussian_filter1d
            gate = gaussian_filter1d(gate, sigma=int(sample_rate * 0.005))
            
            gated = audio * gate
            
            logger.debug(f"Applied spectral gate at {threshold_db} dB")
            return gated.astype(np.float32), True
            
        except ImportError:
            # Fallback without scipy
            logger.warning("scipy not available for spectral gating, using simple gate")
            threshold_linear = 10 ** (threshold_db / 20)
            mask = np.abs(audio) > threshold_linear
            return (audio * mask).astype(np.float32), True
            
        except Exception as e:
            logger.error(f"Spectral gating failed: {e}")
            return audio, False
    
    def _apply_auto_gain(
        self,
        audio: np.ndarray,
        target_db: float
    ) -> Tuple[np.ndarray, bool]:
        """
        Apply automatic gain to normalize volume levels.
        
        Adjusts the audio so the peak level matches target_db.
        Useful for consistent input to ML models.
        """
        try:
            # Find current peak
            peak = np.abs(audio).max()
            
            if peak < 1e-10:
                logger.warning("Audio is silent, skipping auto-gain")
                return audio, False
            
            # Calculate current level in dB
            current_db = 20 * np.log10(peak)
            
            # Calculate gain needed
            gain_db = target_db - current_db
            gain_linear = 10 ** (gain_db / 20)
            
            # Apply gain (with clipping protection)
            gained = np.clip(audio * gain_linear, -1.0, 1.0)
            
            logger.debug(f"Applied auto-gain: {gain_db:.1f} dB (target: {target_db} dB)")
            return gained.astype(np.float32), True
            
        except Exception as e:
            logger.error(f"Auto-gain failed: {e}")
            return audio, False
    
    def get_presets(self) -> dict:
        """
        Get predefined enhancement presets.
        
        Returns dict of preset name -> EnhancementSettings
        """
        return {
            "none": EnhancementSettings(),
            
            "light": EnhancementSettings(
                auto_gain_enabled=True,
                auto_gain_target_db=-3.0,
                highpass_enabled=True,
                highpass_freq=150,
            ),
            
            "moderate": EnhancementSettings(
                bandpass_enabled=True,
                bandpass_low_freq=800,
                bandpass_high_freq=10000,
                auto_gain_enabled=True,
                auto_gain_target_db=-3.0,
                highpass_enabled=True,
                highpass_freq=200,
            ),
            
            "aggressive": EnhancementSettings(
                bandpass_enabled=True,
                bandpass_low_freq=1000,
                bandpass_high_freq=8000,
                noise_reduction_enabled=True,
                noise_reduction_strength=1.0,
                auto_gain_enabled=True,
                auto_gain_target_db=-3.0,
                spectral_gate_enabled=True,
                spectral_gate_threshold_db=-35.0,
            ),
            
            "noisy_environment": EnhancementSettings(
                bandpass_enabled=True,
                bandpass_low_freq=1500,
                bandpass_high_freq=7000,
                noise_reduction_enabled=True,
                noise_reduction_strength=1.5,
                noise_reduction_stationary=True,
                auto_gain_enabled=True,
                auto_gain_target_db=-3.0,
                spectral_gate_enabled=True,
                spectral_gate_threshold_db=-30.0,
                highpass_enabled=True,
                highpass_freq=300,
            ),
            
            "wind_reduction": EnhancementSettings(
                highpass_enabled=True,
                highpass_freq=400,
                bandpass_enabled=True,
                bandpass_low_freq=500,
                bandpass_high_freq=10000,
                auto_gain_enabled=True,
            ),
        }


# Global instance
audio_enhancer = AudioEnhancer()
