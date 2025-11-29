"""
API Dependencies for authentication and other common tasks.
"""
from fastapi import Security, HTTPException, status, Depends
from fastapi.security import APIKeyHeader

from app.core.config import get_settings, Settings

# Define the API key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


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
    if not api_key or api_key not in settings.API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )
    return api_key
