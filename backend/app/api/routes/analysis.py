"""
Audio analysis API endpoints.

Provides:
- Spectrogram generation
- Audio visualization data
- Signal analysis
"""
import base64
import io
import logging
from typing import Optional
from uuid import UUID

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Recording
from app.services.audio_storage import audio_storage
from app.services.audio_processor import audio_processor
from app.schemas.audio import AudioChunkRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analysis/spectrogram")
async def generate_spectrogram(
    request: AudioChunkRequest,
    width: int = Query(800, ge=200, le=2000),
    height: int = Query(400, ge=100, le=1000),
    colormap: str = Query("viridis", pattern="^(viridis|magma|inferno|plasma|gray)$"),
    format: str = Query("png", pattern="^(png|json)$"),
):
    """
    Generate a spectrogram from uploaded audio.

    Args:
        request: Audio data in base64
        width: Image width in pixels
        height: Image height in pixels
        colormap: Matplotlib colormap name
        format: Output format (png image or json data)

    Returns:
        PNG image or JSON with spectrogram data
    """
    try:
        # Decode and preprocess audio
        audio = audio_processor.prepare_for_model(
            audio_base64=request.audio_base64,
            audio_format=request.audio_format.value,
            source_sample_rate=request.sample_rate,
            normalize=True
        )

        # Generate spectrogram
        spec_data = audio_processor.compute_spectrogram(
            audio,
            n_fft=2048,
            hop_length=512,
            n_mels=128
        )

        if format == "json":
            return {
                "spectrogram": spec_data.tolist(),
                "shape": list(spec_data.shape),
                "sample_rate": audio_processor.target_sample_rate,
                "duration_sec": len(audio) / audio_processor.target_sample_rate,
                "n_mels": 128,
                "fmin": 0,
                "fmax": audio_processor.target_sample_rate // 2,
            }

        # Generate image
        image_bytes = _generate_spectrogram_image(
            spec_data, width, height, colormap
        )

        return Response(
            content=image_bytes,
            media_type="image/png"
        )

    except Exception as e:
        logger.error(f"Spectrogram generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/spectrogram/{recording_id}")
async def get_recording_spectrogram(
    recording_id: UUID,
    width: int = Query(800, ge=200, le=2000),
    height: int = Query(400, ge=100, le=1000),
    colormap: str = Query("viridis"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate spectrogram for a stored recording.

    Requires the recording to have audio stored.
    """
    # Get recording
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    if not recording.audio_storage_path:
        raise HTTPException(status_code=404, detail="Audio not stored for this recording")

    try:
        # Load audio
        audio_bytes = await audio_storage.load_recording(recording.audio_storage_path)

        # Decode and process
        audio = audio_processor.decode_base64_audio(
            base64.b64encode(audio_bytes).decode(),
            recording.audio_format,
            recording.sample_rate
        )

        # Resample if needed
        audio = audio_processor.resample(
            audio,
            recording.sample_rate,
            audio_processor.target_sample_rate
        )

        # Generate spectrogram
        spec_data = audio_processor.compute_spectrogram(audio)

        # Generate image
        image_bytes = _generate_spectrogram_image(
            spec_data, width, height, colormap
        )

        return Response(
            content=image_bytes,
            media_type="image/png"
        )

    except Exception as e:
        logger.error(f"Failed to generate spectrogram for {recording_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/waveform")
async def generate_waveform(
    request: AudioChunkRequest,
    width: int = Query(800, ge=200, le=2000),
    height: int = Query(200, ge=50, le=500),
    color: str = Query("#4ecdc4"),
    format: str = Query("png", pattern="^(png|json|svg)$"),
):
    """
    Generate a waveform visualization from uploaded audio.

    Args:
        request: Audio data in base64
        width: Image width in pixels
        height: Image height in pixels
        color: Waveform color (hex)
        format: Output format

    Returns:
        Waveform image or data
    """
    try:
        # Decode audio
        audio = audio_processor.decode_base64_audio(
            request.audio_base64,
            request.audio_format.value,
            request.sample_rate
        )

        if format == "json":
            # Downsample for JSON output
            target_points = min(1000, len(audio))
            step = max(1, len(audio) // target_points)
            downsampled = audio[::step].tolist()

            return {
                "waveform": downsampled,
                "sample_rate": request.sample_rate,
                "duration_sec": len(audio) / request.sample_rate,
                "min": float(np.min(audio)),
                "max": float(np.max(audio)),
                "rms": float(np.sqrt(np.mean(audio ** 2))),
            }

        if format == "svg":
            svg = _generate_waveform_svg(audio, width, height, color)
            return Response(content=svg, media_type="image/svg+xml")

        # Generate PNG
        image_bytes = _generate_waveform_image(audio, width, height, color)
        return Response(content=image_bytes, media_type="image/png")

    except Exception as e:
        logger.error(f"Waveform generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/audio-features")
async def analyze_audio_features(
    request: AudioChunkRequest,
):
    """
    Extract audio features for analysis.

    Returns various acoustic features useful for understanding
    the audio characteristics.
    """
    try:
        # Decode audio
        audio = audio_processor.decode_base64_audio(
            request.audio_base64,
            request.audio_format.value,
            request.sample_rate
        )

        # Basic stats
        duration = len(audio) / request.sample_rate
        rms = float(np.sqrt(np.mean(audio ** 2)))
        peak = float(np.max(np.abs(audio)))
        db = 20 * np.log10(rms + 1e-10)

        # Zero crossing rate
        zero_crossings = np.sum(np.abs(np.diff(np.sign(audio)))) / 2
        zcr = zero_crossings / len(audio)

        # Spectral features (if librosa available)
        spectral_features = {}
        try:
            import librosa
            # Resample to 48kHz for consistency
            audio_48k = audio_processor.resample(audio, request.sample_rate, 48000)

            spectral_centroid = librosa.feature.spectral_centroid(y=audio_48k, sr=48000)
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio_48k, sr=48000)
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio_48k, sr=48000)

            spectral_features = {
                "spectral_centroid_mean": float(np.mean(spectral_centroid)),
                "spectral_bandwidth_mean": float(np.mean(spectral_bandwidth)),
                "spectral_rolloff_mean": float(np.mean(spectral_rolloff)),
            }

            # Dominant frequency
            fft = np.fft.fft(audio_48k)
            freqs = np.fft.fftfreq(len(fft), 1/48000)
            positive_freqs = freqs[:len(freqs)//2]
            positive_fft = np.abs(fft[:len(fft)//2])
            dominant_freq = positive_freqs[np.argmax(positive_fft)]
            spectral_features["dominant_frequency_hz"] = float(dominant_freq)

        except ImportError:
            pass

        # Silence detection
        is_silent = audio_processor.detect_silence(audio)

        return {
            "duration_sec": duration,
            "sample_rate": request.sample_rate,
            "samples": len(audio),
            "amplitude": {
                "rms": rms,
                "peak": peak,
                "db": db,
                "crest_factor": peak / rms if rms > 0 else 0,
            },
            "zero_crossing_rate": zcr,
            "is_silent": is_silent,
            "spectral": spectral_features,
        }

    except Exception as e:
        logger.error(f"Audio analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_spectrogram_image(
    spec_data: np.ndarray,
    width: int,
    height: int,
    colormap: str
) -> bytes:
    """Generate PNG image from spectrogram data."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        ax.imshow(
            spec_data,
            aspect='auto',
            origin='lower',
            cmap=colormap
        )
        ax.set_xlabel('Time')
        ax.set_ylabel('Frequency (Mel)')
        ax.set_title('Mel Spectrogram')

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return buf.getvalue()

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="matplotlib not installed for image generation"
        )


def _generate_waveform_image(
    audio: np.ndarray,
    width: int,
    height: int,
    color: str
) -> bytes:
    """Generate PNG waveform image."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)

        time = np.linspace(0, len(audio), len(audio))
        ax.plot(time, audio, color=color, linewidth=0.5)
        ax.fill_between(time, audio, alpha=0.3, color=color)
        ax.set_xlim(0, len(audio))
        ax.set_ylim(-1, 1)
        ax.set_xlabel('Samples')
        ax.set_ylabel('Amplitude')

        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)

        return buf.getvalue()

    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="matplotlib not installed"
        )


def _generate_waveform_svg(
    audio: np.ndarray,
    width: int,
    height: int,
    color: str
) -> str:
    """Generate SVG waveform."""
    # Downsample to reasonable number of points
    target_points = min(width, len(audio))
    step = max(1, len(audio) // target_points)
    downsampled = audio[::step]

    # Normalize to SVG coordinates
    mid_y = height / 2
    scale_y = height / 2 * 0.9

    # Build path
    points = []
    for i, val in enumerate(downsampled):
        x = (i / len(downsampled)) * width
        y = mid_y - (val * scale_y)
        points.append(f"{x:.1f},{y:.1f}")

    path_d = f"M {points[0]} L " + " L ".join(points[1:])

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
  <line x1="0" y1="{mid_y}" x2="{width}" y2="{mid_y}" stroke="#333" stroke-width="1"/>
  <path d="{path_d}" fill="none" stroke="{color}" stroke-width="1.5"/>
</svg>'''

    return svg
