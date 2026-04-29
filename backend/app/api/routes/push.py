"""Push-Notification Token Registry (v5.12.0).

Lightweight in-memory registry that accepts Expo push tokens from mobile clients.
Persists tokens to a JSON file under app/data/push_tokens.json so they survive restarts.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "push_tokens.json"


class PushRegisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)
    platform: Optional[str] = Field(default=None, max_length=20)
    version: Optional[str] = Field(default=None, max_length=32)


def _load() -> dict:
    if not DATA_FILE.exists():
        return {"tokens": {}}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"tokens": {}}


def _save(data: dict) -> None:
    try:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        DATA_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("push token persist failed: %s", exc)


@router.post("/push/register")
async def register_push_token(payload: PushRegisterRequest) -> dict:
    if not payload.token.startswith("ExponentPushToken[") and not payload.token.startswith("ExpoPushToken["):
        # Soft-warn; some dev tokens may differ — accept but log
        logger.info("push token has unexpected prefix")
    data = _load()
    tokens = data.setdefault("tokens", {})
    tokens[payload.token] = {
        "platform": payload.platform,
        "version": payload.version,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(data)
    return {"status": "ok", "registered": True, "count": len(tokens)}


@router.get("/push/tokens/count")
async def count_tokens() -> dict:
    data = _load()
    return {"count": len(data.get("tokens", {}))}
