"""
Rate limiting for API protection.

Implements a sliding window rate limiter to prevent API abuse.
"""
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional
import threading
import logging

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10  # Allow short bursts


@dataclass
class ClientState:
    """Track rate limit state for a client."""
    minute_requests: list = field(default_factory=list)
    hour_requests: list = field(default_factory=list)
    
    def cleanup(self, now: float):
        """Remove expired timestamps."""
        minute_ago = now - 60
        hour_ago = now - 3600
        self.minute_requests = [t for t in self.minute_requests if t > minute_ago]
        self.hour_requests = [t for t in self.hour_requests if t > hour_ago]


class RateLimiter:
    """
    Sliding window rate limiter.
    
    Tracks requests per client (by API key or IP) and enforces limits.
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        self.config = config or RateLimitConfig()
        self._clients: Dict[str, ClientState] = defaultdict(ClientState)
        self._lock = threading.Lock()
    
    def is_allowed(self, client_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if a request from client is allowed.
        
        Args:
            client_id: Unique client identifier (API key or IP)
            
        Returns:
            Tuple of (is_allowed, rejection_reason)
        """
        now = time.time()
        
        with self._lock:
            state = self._clients[client_id]
            state.cleanup(now)
            
            # Check minute limit
            if len(state.minute_requests) >= self.config.requests_per_minute:
                wait_time = 60 - (now - state.minute_requests[0])
                return False, f"Rate limit exceeded. Try again in {wait_time:.0f}s"
            
            # Check hour limit
            if len(state.hour_requests) >= self.config.requests_per_hour:
                wait_time = 3600 - (now - state.hour_requests[0])
                return False, f"Hourly limit exceeded. Try again in {wait_time/60:.0f}m"
            
            # Record request
            state.minute_requests.append(now)
            state.hour_requests.append(now)
            
            return True, None
    
    def get_remaining(self, client_id: str) -> Dict[str, int]:
        """Get remaining requests for a client."""
        now = time.time()
        
        with self._lock:
            state = self._clients[client_id]
            state.cleanup(now)
            
            return {
                "minute_remaining": max(0, self.config.requests_per_minute - len(state.minute_requests)),
                "hour_remaining": max(0, self.config.requests_per_hour - len(state.hour_requests)),
            }
    
    def reset(self, client_id: str):
        """Reset rate limit for a client."""
        with self._lock:
            if client_id in self._clients:
                del self._clients[client_id]


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware:
    """
    Starlette middleware for rate limiting.
    
    Uses API key if available, otherwise falls back to client IP.
    """
    
    def __init__(self, app, limiter: Optional[RateLimiter] = None):
        self.app = app
        self.limiter = limiter or rate_limiter
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Skip rate limiting for certain paths
        path = scope.get("path", "")
        if path in ("/health", "/health/detailed", "/metrics", "/metrics/json"):
            await self.app(scope, receive, send)
            return
        
        # Get client identifier
        client_id = self._get_client_id(scope)
        
        # Check rate limit
        allowed, reason = self.limiter.is_allowed(client_id)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_id}: {reason}")
            await self._send_rate_limit_response(send, reason)
            return
        
        # Add rate limit headers
        remaining = self.limiter.get_remaining(client_id)
        
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"X-RateLimit-Limit", str(self.limiter.config.requests_per_minute).encode()),
                    (b"X-RateLimit-Remaining", str(remaining["minute_remaining"]).encode()),
                ])
                message["headers"] = headers
            await send(message)
        
        await self.app(scope, receive, send_with_headers)
    
    def _get_client_id(self, scope) -> str:
        """Extract client identifier from request."""
        # Try to get API key from headers
        headers = dict(scope.get("headers", []))
        api_key = headers.get(b"x-api-key", b"").decode()
        
        if api_key:
            return f"key:{api_key[:8]}..."  # Use truncated key
        
        # Fall back to client IP
        client = scope.get("client", ("unknown", 0))
        return f"ip:{client[0]}"
    
    async def _send_rate_limit_response(self, send, reason: str):
        """Send 429 Too Many Requests response."""
        body = f'{{"detail": "{reason}"}}'.encode()
        
        await send({
            "type": "http.response.start",
            "status": 429,
            "headers": [
                (b"content-type", b"application/json"),
                (b"retry-after", b"60"),
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
