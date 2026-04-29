"""Tests for push-notification endpoints (v5.13.0)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _isolated_push_store(tmp_path, monkeypatch):
    """Redirect the push-token JSON store to a temp file per test."""
    from app.api.routes import push as push_module

    tmp_file = tmp_path / "push_tokens.json"
    monkeypatch.setattr(push_module, "DATA_FILE", tmp_file)
    yield tmp_file


def test_register_valid_expo_token(client: TestClient, _isolated_push_store: Path) -> None:
    payload = {
        "token": "ExponentPushToken[abc123XYZ]",
        "platform": "android",
        "version": "5.13.0",
    }
    resp = client.post("/api/v1/push/register", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["registered"] is True
    assert body["count"] == 1

    # Persisted to disk
    assert _isolated_push_store.exists()
    stored = json.loads(_isolated_push_store.read_text(encoding="utf-8"))
    assert payload["token"] in stored["tokens"]
    assert stored["tokens"][payload["token"]]["platform"] == "android"


def test_register_idempotent(client: TestClient) -> None:
    payload = {"token": "ExponentPushToken[same-token]", "platform": "ios"}
    client.post("/api/v1/push/register", json=payload)
    resp = client.post("/api/v1/push/register", json=payload)
    assert resp.status_code == 200
    assert resp.json()["count"] == 1  # de-duped on token key


def test_register_rejects_short_token(client: TestClient) -> None:
    resp = client.post("/api/v1/push/register", json={"token": "x"})
    assert resp.status_code == 422  # Pydantic min_length validation


def test_register_accepts_unusual_prefix(client: TestClient) -> None:
    """Unknown prefix should be soft-warned but still accepted."""
    resp = client.post(
        "/api/v1/push/register",
        json={"token": "DevPushToken[local-dev-token]"},
    )
    assert resp.status_code == 200
    assert resp.json()["registered"] is True


def test_token_count_endpoint(client: TestClient) -> None:
    assert client.get("/api/v1/push/tokens/count").json() == {"count": 0}
    client.post(
        "/api/v1/push/register",
        json={"token": "ExponentPushToken[t1]"},
    )
    client.post(
        "/api/v1/push/register",
        json={"token": "ExponentPushToken[t2]"},
    )
    assert client.get("/api/v1/push/tokens/count").json() == {"count": 2}


def test_send_push_with_no_tokens_returns_zero(client: TestClient) -> None:
    """No registered tokens -> sent=0 without contacting Expo."""
    resp = client.post(
        "/api/v1/push/send",
        json={"title": "Hi", "body": "Test"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sent"] == 0
    assert body["receipts"] == []
    assert body["pruned"] == []


def test_send_push_mocks_expo_api(client: TestClient, monkeypatch) -> None:
    """With a registered token, /push/send should hit Expo (mocked)."""
    from app.api.routes import push as push_module

    client.post(
        "/api/v1/push/register",
        json={"token": "ExponentPushToken[good]"},
    )
    client.post(
        "/api/v1/push/register",
        json={"token": "ExponentPushToken[stale]"},
    )

    captured: dict = {}

    class _FakeResp:
        status_code = 200

        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self) -> None:
            return None

        def json(self):
            return self._payload

    class _FakeClient:
        def __init__(self, *_, **__):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return False

        async def post(self, url, json=None, headers=None):
            captured["url"] = url
            captured["json"] = json
            return _FakeResp(
                {
                    "data": [
                        {"status": "ok", "id": "ticket-1"},
                        {
                            "status": "error",
                            "message": "stale",
                            "details": {"error": "DeviceNotRegistered"},
                        },
                    ]
                }
            )

    monkeypatch.setattr(push_module.httpx, "AsyncClient", _FakeClient)

    resp = client.post(
        "/api/v1/push/send",
        json={"title": "Bird!", "body": "Detected", "data": {"k": "v"}},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sent"] == 2
    assert "ExponentPushToken[stale]" in body["pruned"]
    assert captured["url"] == push_module.EXPO_PUSH_URL
    assert len(captured["json"]) == 2
    assert captured["json"][0]["title"] == "Bird!"

    # Stale token pruned from registry
    assert client.get("/api/v1/push/tokens/count").json() == {"count": 1}
