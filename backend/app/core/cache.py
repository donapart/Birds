"""
Redis caching service for BirdSound.

Provides:
- Prediction caching
- Model result caching
- Rate limiting
- Session storage
"""
import json
import logging
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
import asyncio

logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis-based caching service.

    Falls back to in-memory cache if Redis is unavailable.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        default_ttl: int = 3600,
        prefix: str = "birdsound"
    ):
        """
        Initialize cache service.

        Args:
            redis_url: Redis connection URL (e.g., redis://localhost:6379/0)
            default_ttl: Default TTL in seconds
            prefix: Key prefix for all cache entries
        """
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.prefix = prefix
        self._redis = None
        self._memory_cache = {}  # Fallback in-memory cache
        self._connected = False

    async def connect(self) -> bool:
        """Connect to Redis."""
        if not self.redis_url:
            logger.info("No Redis URL configured, using in-memory cache")
            return False

        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            self._connected = True
            logger.info(f"Connected to Redis at {self.redis_url}")
            return True

        except ImportError:
            logger.warning("redis package not installed, using in-memory cache")
            return False
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}, using in-memory cache")
            return False

    async def disconnect(self):
        """Disconnect from Redis."""
        if self._redis:
            await self._redis.close()
            self._redis = None
            self._connected = False

    def _make_key(self, key: str) -> str:
        """Create prefixed cache key."""
        return f"{self.prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        full_key = self._make_key(key)

        if self._connected and self._redis:
            try:
                value = await self._redis.get(full_key)
                if value:
                    return json.loads(value)
            except Exception as e:
                logger.error(f"Cache get error: {e}")

        # Fallback to memory cache
        return self._memory_cache.get(full_key)

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache."""
        full_key = self._make_key(key)
        ttl = ttl or self.default_ttl

        if self._connected and self._redis:
            try:
                await self._redis.setex(
                    full_key,
                    ttl,
                    json.dumps(value, default=str)
                )
                return True
            except Exception as e:
                logger.error(f"Cache set error: {e}")

        # Fallback to memory cache
        self._memory_cache[full_key] = value
        return True

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        full_key = self._make_key(key)

        if self._connected and self._redis:
            try:
                await self._redis.delete(full_key)
            except Exception as e:
                logger.error(f"Cache delete error: {e}")

        self._memory_cache.pop(full_key, None)
        return True

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        full_key = self._make_key(key)

        if self._connected and self._redis:
            try:
                return await self._redis.exists(full_key) > 0
            except Exception as e:
                logger.error(f"Cache exists error: {e}")

        return full_key in self._memory_cache

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        full_pattern = self._make_key(pattern)
        count = 0

        if self._connected and self._redis:
            try:
                async for key in self._redis.scan_iter(match=full_pattern):
                    await self._redis.delete(key)
                    count += 1
            except Exception as e:
                logger.error(f"Cache clear error: {e}")

        # Clear from memory cache
        keys_to_delete = [k for k in self._memory_cache if k.startswith(full_pattern.replace("*", ""))]
        for k in keys_to_delete:
            del self._memory_cache[k]
            count += 1

        return count

    # Caching decorators
    def cached(
        self,
        key_builder: Optional[Callable] = None,
        ttl: Optional[int] = None
    ):
        """
        Decorator for caching function results.

        Args:
            key_builder: Function to build cache key from args
            ttl: Cache TTL in seconds
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Build cache key
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    # Default: hash of function name and args
                    key_data = f"{func.__name__}:{args}:{kwargs}"
                    cache_key = hashlib.md5(key_data.encode()).hexdigest()

                # Try to get from cache
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Call function and cache result
                result = await func(*args, **kwargs)
                await self.set(cache_key, result, ttl)

                return result

            return wrapper
        return decorator

    # Rate limiting
    async def check_rate_limit(
        self,
        identifier: str,
        limit: int = 100,
        window_seconds: int = 60
    ) -> tuple:
        """
        Check rate limit for an identifier.

        Args:
            identifier: Unique identifier (e.g., IP, device_id)
            limit: Maximum requests per window
            window_seconds: Time window in seconds

        Returns:
            (allowed, remaining, reset_in_seconds)
        """
        key = f"ratelimit:{identifier}"
        full_key = self._make_key(key)

        if self._connected and self._redis:
            try:
                pipe = self._redis.pipeline()
                pipe.incr(full_key)
                pipe.ttl(full_key)
                results = await pipe.execute()

                count = results[0]
                ttl = results[1]

                if ttl == -1:
                    # Key exists but no TTL, set it
                    await self._redis.expire(full_key, window_seconds)
                    ttl = window_seconds

                allowed = count <= limit
                remaining = max(0, limit - count)

                return allowed, remaining, ttl if ttl > 0 else window_seconds

            except Exception as e:
                logger.error(f"Rate limit check error: {e}")
                return True, limit, window_seconds

        # Fallback: always allow
        return True, limit, window_seconds

    # Prediction caching
    def prediction_cache_key(self, audio_hash: str, models: list) -> str:
        """Generate cache key for prediction."""
        models_str = ",".join(sorted(models)) if models else "all"
        return f"prediction:{audio_hash}:{models_str}"

    async def get_cached_prediction(
        self,
        audio_data: bytes,
        models: Optional[list] = None
    ) -> Optional[dict]:
        """Get cached prediction for audio data."""
        audio_hash = hashlib.md5(audio_data).hexdigest()
        key = self.prediction_cache_key(audio_hash, models or [])
        return await self.get(key)

    async def cache_prediction(
        self,
        audio_data: bytes,
        prediction: dict,
        models: Optional[list] = None,
        ttl: int = 300  # 5 minutes
    ):
        """Cache prediction for audio data."""
        audio_hash = hashlib.md5(audio_data).hexdigest()
        key = self.prediction_cache_key(audio_hash, models or [])
        await self.set(key, prediction, ttl)


# Factory function
def get_cache_service() -> CacheService:
    """Get configured cache service."""
    from app.core.config import get_settings
    settings = get_settings()

    redis_url = getattr(settings, "REDIS_URL", None)

    return CacheService(
        redis_url=redis_url,
        default_ttl=getattr(settings, "CACHE_TTL", 3600),
        prefix="birdsound"
    )


# Global instance
cache_service = get_cache_service()
