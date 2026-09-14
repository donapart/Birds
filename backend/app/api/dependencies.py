"""
API Dependencies for authentication and other common tasks.
"""
import secrets

from fastapi import Security, HTTPException, status, Depends, WebSocket, WebSocketException
from fastapi.security import APIKeyHeader

from app.core.config import get_settings, Settings

# Define the API key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _is_valid_api_key(api_key: str, settings: Settings) -> bool:
    """Constant-time comparison against all configured keys."""
    return any(secrets.compare_digest(api_key, valid) for valid in settings.API_KEYS)


def get_api_key(
    settings: Settings = Depends(get_settings),
    api_key: str = Security(api_key_header),
) -> str:
    """
    Dependency to validate the API key.

    Compares the provided X-API-Key with the list of valid keys
    in the application settings.

    Raises:
        HTTPException: If the key is missing or invalid.

    Returns:
        The validated API key.
    """
    if not api_key or not _is_valid_api_key(api_key, settings):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return api_key


async def get_ws_api_key(
    websocket: WebSocket,
    settings: Settings = Depends(get_settings),
) -> str:
    """
    Dependency to validate the API key on WebSocket connections.

    Accepts the key via the ``X-API-Key`` header or the ``api_key``
    query parameter (browsers cannot set custom WebSocket headers).
    """
    api_key = websocket.headers.get("x-api-key") or websocket.query_params.get("api_key")
    if not api_key or not _is_valid_api_key(api_key, settings):
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid or missing API Key",
        )
    return api_key
