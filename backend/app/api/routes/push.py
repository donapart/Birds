"""Push-Notification Token Registry & Sender (v5.13.0).

Accepts Expo push tokens from mobile clients, persists them under
app/data/push_tokens.json, and provides endpoints + a helper to send
notifications via the Expo Push API (https://exp.host/--/api/v2/push/send).
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()

DATA_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "push_tokens.json"
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushRegisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)
    platform: Optional[str] = Field(default=None, max_length=20)
    version: Optional[str] = Field(default=None, max_length=32)


class PushSendRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=1000)
    data: Optional[Dict[str, Any]] = None
    tokens: Optional[List[str]] = Field(
        default=None,
        description="Optional subset of tokens. If omitted, broadcasts to all registered tokens.",
    )


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


def _is_valid_expo_token(t: str) -> bool:
    return t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")


async def send_expo_push(
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    tokens: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Send a push notification via Expo Push API.

    Returns a dict with sent count, receipts, and any invalid tokens that were
    pruned from the registry (DeviceNotRegistered / InvalidCredentials).
    """
    store = _load()
    registered: Dict[str, dict] = store.get("tokens", {})
    target_tokens = [t for t in (tokens or list(registered.keys())) if _is_valid_expo_token(t)]
    if not target_tokens:
        return {"sent": 0, "receipts": [], "pruned": []}

    # Expo accepts batches up to 100 messages per request
    messages = [
        {"to": t, "sound": "default", "title": title, "body": body, "data": data or {}}
        for t in target_tokens
    ]
    receipts: List[Any] = []
    pruned: List[str] = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for i in range(0, len(messages), 100):
                batch = messages[i : i + 100]
                resp = await client.post(
                    EXPO_PUSH_URL,
                    json=batch,
                    headers={
                        "accept": "application/json",
                        "accept-encoding": "gzip, deflate",
                        "content-type": "application/json",
                    },
                )
                resp.raise_for_status()
                payload = resp.json()
                data_arr = payload.get("data", [])
                receipts.extend(data_arr)
                for tok, ticket in zip([m["to"] for m in batch], data_arr):
                    if isinstance(ticket, dict) and ticket.get("status") == "error":
                        details = ticket.get("details") or {}
                        err = details.get("error")
                        if err in ("DeviceNotRegistered", "InvalidCredentials"):
                            pruned.append(tok)
    except httpx.HTTPError as exc:
        logger.warning("Expo push send failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Expo push delivery failed: {exc}")

    if pruned:
        for t in pruned:
            registered.pop(t, None)
        _save(store)
        logger.info("Pruned %d invalid push tokens", len(pruned))

    return {"sent": len(target_tokens), "receipts": receipts, "pruned": pruned}


@router.post("/push/send")
async def send_push(payload: PushSendRequest) -> dict:
    """Broadcast or targeted push send via Expo. Admin/diagnostic endpoint."""
    result = await send_expo_push(
        title=payload.title,
        body=payload.body,
        data=payload.data,
        tokens=payload.tokens,
    )
    return {"status": "ok", **result}


@router.post("/push/test")
async def send_test_push() -> dict:
    """Send a fixed test notification to all registered tokens."""
    return await send_expo_push(
        title="BirdSound Test",
        body="Push-Benachrichtigungen funktionieren! 🐦",
        data={"type": "test"},
    )
