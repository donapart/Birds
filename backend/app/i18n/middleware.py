"""
Language middleware for FastAPI.
Detects language from request headers, query params, or cookies.
"""

from typing import Optional
from fastapi import Request, Query, Header
from starlette.middleware.base import BaseHTTPMiddleware

from .translations import SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, get_translator


class LanguageMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and set language for each request.
    Priority: Query param > Cookie > Accept-Language header > Default
    """

    async def dispatch(self, request: Request, call_next):
        # Try to get language from query parameter
        lang = request.query_params.get("lang")

        # Try to get from cookie
        if not lang or lang not in SUPPORTED_LANGUAGES:
            lang = request.cookies.get("lang")

        # Try to get from Accept-Language header
        if not lang or lang not in SUPPORTED_LANGUAGES:
            accept_lang = request.headers.get("Accept-Language", "")
            lang = parse_accept_language(accept_lang)

        # Default fallback
        if not lang or lang not in SUPPORTED_LANGUAGES:
            lang = DEFAULT_LANGUAGE

        # Store language in request state
        request.state.lang = lang
        request.state.t = get_translator(lang)

        response = await call_next(request)

        # Set language cookie if it was specified in query
        query_lang = request.query_params.get("lang")
        if query_lang and query_lang in SUPPORTED_LANGUAGES:
            response.set_cookie(
                key="lang",
                value=query_lang,
                max_age=365 * 24 * 60 * 60,  # 1 year
                httponly=False,
                samesite="lax"
            )

        return response


def parse_accept_language(header: str) -> Optional[str]:
    """
    Parse Accept-Language header and return best matching language.

    Examples:
        "de-DE,de;q=0.9,en;q=0.8" -> "de"
        "en-US,en;q=0.9" -> "en"
    """
    if not header:
        return None

    # Parse language preferences
    languages = []
    for part in header.split(","):
        part = part.strip()
        if ";q=" in part:
            lang, q = part.split(";q=")
            try:
                quality = float(q)
            except ValueError:
                quality = 0.0
        else:
            lang = part
            quality = 1.0

        # Extract primary language code
        lang = lang.split("-")[0].lower()
        languages.append((lang, quality))

    # Sort by quality (highest first)
    languages.sort(key=lambda x: x[1], reverse=True)

    # Find first supported language
    for lang, _ in languages:
        if lang in SUPPORTED_LANGUAGES:
            return lang

    return None


async def get_language(
    request: Request,
    lang: Optional[str] = Query(
        None,
        description="Language code (de/en)",
        regex="^(de|en)$"
    ),
    accept_language: Optional[str] = Header(None, alias="Accept-Language")
) -> str:
    """
    FastAPI dependency to get current language.
    Can be used in route handlers.

    Usage:
        @app.get("/api/example")
        async def example(lang: str = Depends(get_language)):
            t = get_translator(lang)
            return {"message": t("welcome")}
    """
    # Query param has highest priority
    if lang and lang in SUPPORTED_LANGUAGES:
        return lang

    # Try request state (set by middleware)
    if hasattr(request.state, "lang"):
        return request.state.lang

    # Try cookie
    cookie_lang = request.cookies.get("lang")
    if cookie_lang and cookie_lang in SUPPORTED_LANGUAGES:
        return cookie_lang

    # Try Accept-Language header
    if accept_language:
        parsed = parse_accept_language(accept_language)
        if parsed:
            return parsed

    return DEFAULT_LANGUAGE
