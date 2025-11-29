"""
Audio storage service for saving and retrieving audio recordings.

Supports:
- Local filesystem storage
- S3-compatible object storage (AWS S3, MinIO, etc.)
"""
import asyncio
import base64
import hashlib
import io
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Optional, BinaryIO
from uuid import UUID

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    async def save(
        self,
        recording_id: UUID,
        audio_data: bytes,
        format: str,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Save audio data and return the storage path.

        Args:
            recording_id: Unique recording identifier
            audio_data: Raw audio bytes
            format: Audio format (wav, mp3, etc.)
            metadata: Optional metadata to store

        Returns:
            Storage path/URL for the saved file
        """
        pass

    @abstractmethod
    async def load(self, path: str) -> bytes:
        """Load audio data from storage."""
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """Delete audio from storage."""
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """Check if audio exists in storage."""
        pass


class LocalStorageBackend(StorageBackend):
    """
    Local filesystem storage backend.

    Organizes files by date: /base_path/YYYY/MM/DD/recording_id.format
    """

    def __init__(self, base_path: str = "audio_storage"):
        """Initialize local storage."""
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"LocalStorage initialized at {self.base_path.absolute()}")

    def _get_path(self, recording_id: UUID, format: str, timestamp: Optional[datetime] = None) -> Path:
        """Generate storage path for a recording."""
        ts = timestamp or datetime.utcnow()
        date_path = self.base_path / str(ts.year) / f"{ts.month:02d}" / f"{ts.day:02d}"
        return date_path / f"{recording_id}.{format}"

    async def save(
        self,
        recording_id: UUID,
        audio_data: bytes,
        format: str,
        metadata: Optional[dict] = None
    ) -> str:
        """Save audio to local filesystem."""
        timestamp = metadata.get("timestamp") if metadata else None
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

        file_path = self._get_path(recording_id, format, timestamp)

        def write_file():
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(audio_data)

            # Save metadata sidecar if provided
            if metadata:
                import json
                meta_path = file_path.with_suffix(".json")
                with open(meta_path, "w") as f:
                    json.dump(metadata, f, indent=2, default=str)

        await asyncio.to_thread(write_file)
        logger.debug(f"Saved audio to {file_path}")

        return str(file_path.relative_to(self.base_path))

    async def load(self, path: str) -> bytes:
        """Load audio from local filesystem."""
        file_path = self.base_path / path

        def read_file():
            with open(file_path, "rb") as f:
                return f.read()

        return await asyncio.to_thread(read_file)

    async def delete(self, path: str) -> bool:
        """Delete audio from local filesystem."""
        file_path = self.base_path / path

        def delete_file():
            if file_path.exists():
                file_path.unlink()
                # Also delete metadata sidecar
                meta_path = file_path.with_suffix(".json")
                if meta_path.exists():
                    meta_path.unlink()
                return True
            return False

        return await asyncio.to_thread(delete_file)

    async def exists(self, path: str) -> bool:
        """Check if audio exists."""
        file_path = self.base_path / path
        return await asyncio.to_thread(file_path.exists)


class S3StorageBackend(StorageBackend):
    """
    S3-compatible object storage backend.

    Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
    """

    def __init__(
        self,
        bucket: str,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region: str = "us-east-1",
        prefix: str = "recordings"
    ):
        """
        Initialize S3 storage.

        Args:
            bucket: S3 bucket name
            endpoint_url: Custom endpoint URL (for MinIO, etc.)
            access_key: AWS access key ID
            secret_key: AWS secret access key
            region: AWS region
            prefix: Key prefix for all objects
        """
        self.bucket = bucket
        self.endpoint_url = endpoint_url
        self.prefix = prefix
        self._client = None

        # Lazy import boto3
        try:
            import boto3
            self._session = boto3.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            logger.info(f"S3Storage initialized for bucket {bucket}")
        except ImportError:
            logger.error("boto3 not installed. pip install boto3")
            raise

    @property
    def client(self):
        """Get or create S3 client."""
        if self._client is None:
            self._client = self._session.client(
                "s3",
                endpoint_url=self.endpoint_url
            )
        return self._client

    def _get_key(self, recording_id: UUID, format: str, timestamp: Optional[datetime] = None) -> str:
        """Generate S3 key for a recording."""
        ts = timestamp or datetime.utcnow()
        return f"{self.prefix}/{ts.year}/{ts.month:02d}/{ts.day:02d}/{recording_id}.{format}"

    async def save(
        self,
        recording_id: UUID,
        audio_data: bytes,
        format: str,
        metadata: Optional[dict] = None
    ) -> str:
        """Save audio to S3."""
        timestamp = metadata.get("timestamp") if metadata else None
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

        key = self._get_key(recording_id, format, timestamp)

        # Prepare metadata for S3
        s3_metadata = {}
        if metadata:
            for k, v in metadata.items():
                if isinstance(v, (str, int, float)):
                    s3_metadata[str(k)] = str(v)

        def upload():
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=audio_data,
                Metadata=s3_metadata,
                ContentType=f"audio/{format}"
            )

        await asyncio.to_thread(upload)
        logger.debug(f"Saved audio to s3://{self.bucket}/{key}")

        return key

    async def load(self, path: str) -> bytes:
        """Load audio from S3."""
        def download():
            response = self.client.get_object(Bucket=self.bucket, Key=path)
            return response["Body"].read()

        return await asyncio.to_thread(download)

    async def delete(self, path: str) -> bool:
        """Delete audio from S3."""
        def delete_obj():
            self.client.delete_object(Bucket=self.bucket, Key=path)
            return True

        try:
            return await asyncio.to_thread(delete_obj)
        except Exception as e:
            logger.error(f"Failed to delete from S3: {e}")
            return False

    async def exists(self, path: str) -> bool:
        """Check if audio exists in S3."""
        def check():
            try:
                self.client.head_object(Bucket=self.bucket, Key=path)
                return True
            except Exception:
                return False

        return await asyncio.to_thread(check)

    def get_presigned_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for temporary access.

        Args:
            path: Object key
            expires_in: URL validity in seconds

        Returns:
            Presigned URL
        """
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": path},
            ExpiresIn=expires_in
        )


class AudioStorageService:
    """
    High-level audio storage service.

    Handles format conversion, compression, and storage backend selection.
    """

    def __init__(self, backend: Optional[StorageBackend] = None):
        """
        Initialize audio storage service.

        Args:
            backend: Storage backend to use (defaults to local storage)
        """
        self.backend = backend or LocalStorageBackend(
            getattr(settings, "AUDIO_STORAGE_PATH", "audio_storage")
        )

    async def save_recording(
        self,
        recording_id: UUID,
        audio_data: bytes,
        source_format: str,
        sample_rate: int,
        timestamp: Optional[datetime] = None,
        device_id: Optional[str] = None,
        location: Optional[tuple] = None,
        convert_to: str = "wav"
    ) -> str:
        """
        Save a recording with metadata.

        Args:
            recording_id: Unique recording ID
            audio_data: Raw audio bytes
            source_format: Source format (pcm16_le, wav, etc.)
            sample_rate: Sample rate in Hz
            timestamp: Recording timestamp
            device_id: Device identifier
            location: (lat, lon) tuple
            convert_to: Target format for storage

        Returns:
            Storage path for the saved recording
        """
        # Convert to target format if needed
        if source_format != convert_to:
            audio_data = await self._convert_audio(
                audio_data, source_format, convert_to, sample_rate
            )

        # Build metadata
        metadata = {
            "recording_id": str(recording_id),
            "timestamp": timestamp.isoformat() if timestamp else datetime.utcnow().isoformat(),
            "sample_rate": sample_rate,
            "format": convert_to,
            "size_bytes": len(audio_data),
            "checksum": hashlib.md5(audio_data).hexdigest(),
        }

        if device_id:
            metadata["device_id"] = device_id
        if location:
            metadata["latitude"] = location[0]
            metadata["longitude"] = location[1]

        # Save to backend
        path = await self.backend.save(
            recording_id=recording_id,
            audio_data=audio_data,
            format=convert_to,
            metadata=metadata
        )

        return path

    async def _convert_audio(
        self,
        audio_data: bytes,
        source_format: str,
        target_format: str,
        sample_rate: int
    ) -> bytes:
        """Convert audio between formats."""
        import numpy as np

        # Decode source format
        if source_format == "pcm16_le":
            audio = np.frombuffer(audio_data, dtype=np.int16)
        elif source_format == "pcm16_be":
            audio = np.frombuffer(audio_data, dtype=">i2")
        elif source_format == "float32":
            audio = np.frombuffer(audio_data, dtype=np.float32)
        else:
            # Try to decode as audio file
            try:
                import soundfile as sf
                audio, _ = sf.read(io.BytesIO(audio_data))
            except Exception:
                logger.warning(f"Could not decode {source_format}, storing as-is")
                return audio_data

        # Normalize to float
        if audio.dtype == np.int16:
            audio = audio.astype(np.float32) / 32768.0

        # Encode target format
        if target_format == "wav":
            try:
                import soundfile as sf
                buffer = io.BytesIO()
                sf.write(buffer, audio, sample_rate, format="WAV", subtype="PCM_16")
                return buffer.getvalue()
            except ImportError:
                # Fallback to raw PCM
                return (audio * 32767).astype(np.int16).tobytes()
        elif target_format == "ogg":
            try:
                import soundfile as sf
                buffer = io.BytesIO()
                sf.write(buffer, audio, sample_rate, format="OGG", subtype="VORBIS")
                return buffer.getvalue()
            except ImportError:
                logger.warning("soundfile with OGG support not available")
                return audio_data
        else:
            return audio_data

    async def load_recording(self, path: str) -> bytes:
        """Load a recording from storage."""
        return await self.backend.load(path)

    async def delete_recording(self, path: str) -> bool:
        """Delete a recording from storage."""
        return await self.backend.delete(path)

    async def get_recording_url(self, path: str, expires_in: int = 3600) -> Optional[str]:
        """
        Get a URL for accessing a recording.

        For S3 backend, returns a presigned URL.
        For local backend, returns None (use API endpoint instead).
        """
        if isinstance(self.backend, S3StorageBackend):
            return self.backend.get_presigned_url(path, expires_in)
        return None


# Factory function
def get_storage_service() -> AudioStorageService:
    """Get configured storage service instance."""
    storage_type = getattr(settings, "STORAGE_TYPE", "local")

    if storage_type == "s3":
        backend = S3StorageBackend(
            bucket=getattr(settings, "S3_BUCKET", "birdsound-recordings"),
            endpoint_url=getattr(settings, "S3_ENDPOINT_URL", None),
            access_key=getattr(settings, "S3_ACCESS_KEY", None),
            secret_key=getattr(settings, "S3_SECRET_KEY", None),
            region=getattr(settings, "S3_REGION", "us-east-1"),
        )
    else:
        backend = LocalStorageBackend(
            getattr(settings, "AUDIO_STORAGE_PATH", "audio_storage")
        )

    return AudioStorageService(backend)


# Global instance
audio_storage = get_storage_service()
