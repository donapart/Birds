"""
Internationalization API routes.
Provides translation data and language management.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, Response, Query

from app.i18n import get_language, get_translation, SUPPORTED_LANGUAGES
from app.i18n.translations import get_all_translations, DEFAULT_LANGUAGE

router = APIRouter(prefix="/i18n", tags=["i18n"])


@router.get("/languages")
async def get_supported_languages() -> Dict[str, Any]:
    """
    Get list of supported languages.
    """
    return {
        "languages": [
            {"code": "de", "name": "Deutsch", "native_name": "Deutsch", "flag": "🇩🇪"},
            {"code": "en", "name": "English", "native_name": "English", "flag": "🇬🇧"}
        ],
        "default": DEFAULT_LANGUAGE
    }


@router.get("/translations")
async def get_translations(
    lang: str = Depends(get_language)
) -> Dict[str, Any]:
    """
    Get all translations for the current language.
    Used by frontend to load translations.
    """
    return {
        "language": lang,
        "translations": get_all_translations(lang)
    }


@router.get("/translations/{key}")
async def get_single_translation(
    key: str,
    lang: str = Depends(get_language),
    variables: Optional[str] = Query(None, description="JSON-encoded variables for substitution")
) -> Dict[str, str]:
    """
    Get a single translation by key.
    Supports dot notation for nested keys (e.g., "nav.home").
    """
    import json

    kwargs = {}
    if variables:
        try:
            kwargs = json.loads(variables)
        except json.JSONDecodeError:
            pass

    translation = get_translation(key, lang, **kwargs)

    return {
        "key": key,
        "language": lang,
        "translation": translation
    }


@router.post("/set-language/{lang_code}")
async def set_language(
    lang_code: str,
    response: Response
) -> Dict[str, str]:
    """
    Set the user's preferred language via cookie.
    """
    if lang_code not in SUPPORTED_LANGUAGES:
        return {
            "status": "error",
            "message": f"Unsupported language: {lang_code}. Supported: {', '.join(SUPPORTED_LANGUAGES)}"
        }

    response.set_cookie(
        key="lang",
        value=lang_code,
        max_age=365 * 24 * 60 * 60,  # 1 year
        httponly=False,
        samesite="lax"
    )

    return {
        "status": "success",
        "language": lang_code,
        "message": get_translation("success.settings_saved", lang_code)
    }


@router.get("/species-names")
async def get_species_names(
    lang: str = Depends(get_language),
    species_ids: Optional[List[str]] = Query(None, description="Filter by species IDs")
) -> Dict[str, Any]:
    """
    Get species names in the selected language.
    Uses common_name_de for German and common_name_en for English.
    """
    from app.data.species_europe import EUROPEAN_BIRD_SPECIES

    name_field = "common_name_de" if lang == "de" else "common_name_en"

    species_names = {}
    for species in EUROPEAN_BIRD_SPECIES:
        if species_ids is None or species["scientific_name"] in species_ids:
            species_names[species["scientific_name"]] = {
                "name": species.get(name_field, species.get("common_name_en", "")),
                "scientific_name": species["scientific_name"],
                "family": species.get("family", "")
            }

    return {
        "language": lang,
        "species": species_names
    }
