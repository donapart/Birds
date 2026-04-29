"""Mobile-app meta endpoints (version checks etc.)."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter()

# JSON-Datei mit den aktuellen Mobile-App-Versionsinformationen.
# Pfad: backend/app/data/mobile_version.json
_DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "mobile_version.json"

# Fallback-Defaults, falls die Datei fehlt oder defekt ist.
_DEFAULT: Dict[str, Any] = {
    "version": "5.10.0",
    "versionCode": 63,
    "downloadUrl": "https://github.com/donapart/Birds/releases/latest",
    "releaseNotes": "Update-Banner, geteilte Statistiken, Karten-Filter, Brutzeiten in der Bibliothek.",
    "mandatory": False,
}


def _read_version_info() -> Dict[str, Any]:
    try:
        if _DATA_FILE.exists():
            with _DATA_FILE.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
            if isinstance(data, dict):
                merged = {**_DEFAULT, **data}
                return merged
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("mobile_version.json konnte nicht gelesen werden: %s", exc)
    return dict(_DEFAULT)


@router.get("/mobile/latest-version", tags=["Mobile"])
async def latest_mobile_version() -> Dict[str, Any]:
    """Liefert die aktuelle Version der mobilen App.

    Wird von der Android/iOS-App beim Start abgefragt, um den Nutzer auf
    Updates hinzuweisen.
    """
    return _read_version_info()
