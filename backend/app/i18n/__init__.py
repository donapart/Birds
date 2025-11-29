"""
Internationalization (i18n) module for multi-language support.
Supports German (de) and English (en).
"""

from .translations import get_translation, get_translator, SUPPORTED_LANGUAGES
from .middleware import get_language, LanguageMiddleware

__all__ = [
    "get_translation",
    "get_translator",
    "SUPPORTED_LANGUAGES",
    "get_language",
    "LanguageMiddleware"
]
