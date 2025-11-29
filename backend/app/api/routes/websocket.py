"""
WebSocket endpoints for real-time bird sound detection updates.

Provides:
- Live prediction streaming
- Device connection management
- Broadcast to multiple clients
"""
import asyncio
import logging
import json
from typing import Dict, Set
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.audio import AudioChunkRequest
from app.schemas.prediction import PredictionResponse
from app.services.prediction_service import PredictionService
from app.db.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.

    Supports:
    - Multiple viewers per device
    - Broadcast to all connected clients
    - Device-specific channels
    """

    def __init__(self):
        # All active connections
        self.active_connections: Set[WebSocket] = set()
        # Connections subscribed to specific devices
        self.device_subscriptions: Dict[str, Set[WebSocket]] = {}
        # Connections for live feed (all predictions)
        self.live_feed_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Accept and register a new connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a connection from all subscriptions."""
        self.active_connections.discard(websocket)
        self.live_feed_connections.discard(websocket)

        # Remove from device subscriptions
        for device_id in list(self.device_subscriptions.keys()):
            self.device_subscriptions[device_id].discard(websocket)
            if not self.device_subscriptions[device_id]:
                del self.device_subscriptions[device_id]

        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    def subscribe_to_device(self, websocket: WebSocket, device_id: str):
        """Subscribe to updates from a specific device."""
        if device_id not in self.device_subscriptions:
            self.device_subscriptions[device_id] = set()
        self.device_subscriptions[device_id].add(websocket)
        logger.debug(f"Subscribed to device {device_id}")

    def subscribe_to_live_feed(self, websocket: WebSocket):
        """Subscribe to all prediction updates."""
        self.live_feed_connections.add(websocket)
        logger.debug("Subscribed to live feed")

    async def broadcast_prediction(self, prediction: PredictionResponse, device_id: str):
        """Broadcast a prediction to relevant subscribers."""
        message = {
            "type": "prediction",
            "timestamp": datetime.utcnow().isoformat(),
            "device_id": device_id,
            "data": {
                "recording_id": str(prediction.recording_id),
                "species": prediction.consensus.species_common,
                "confidence": prediction.consensus.confidence,
                "agreement": f"{prediction.consensus.agreement_count}/{prediction.consensus.total_models}",
                "latitude": prediction.latitude,
                "longitude": prediction.longitude,
                "models": [
                    {
                        "name": mp.model_name,
                        "species": mp.predictions[0].species_common if mp.predictions else None,
                        "confidence": mp.predictions[0].confidence if mp.predictions else 0
                    }
                    for mp in prediction.model_predictions
                ]
            }
        }

        message_json = json.dumps(message)

        # Send to device subscribers
        if device_id in self.device_subscriptions:
            for websocket in self.device_subscriptions[device_id].copy():
                try:
                    await websocket.send_text(message_json)
                except Exception as e:
                    logger.error(f"Failed to send to device subscriber: {e}")
                    self.disconnect(websocket)

        # Send to live feed subscribers
        for websocket in self.live_feed_connections.copy():
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Failed to send to live feed subscriber: {e}")
                self.disconnect(websocket)

    async def send_status(self, websocket: WebSocket, status: dict):
        """Send a status message to a specific client."""
        message = {
            "type": "status",
            "timestamp": datetime.utcnow().isoformat(),
            "data": status
        }
        await websocket.send_text(json.dumps(message))


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/live")
async def websocket_live_feed(websocket: WebSocket):
    """
    WebSocket endpoint for live prediction feed.

    Receives all predictions from all devices in real-time.

    Messages sent:
    - type: "prediction" - New bird detection
    - type: "status" - Connection status updates

    Example client (JavaScript):
    ```javascript
    const ws = new WebSocket('ws://localhost:8000/ws/live');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'prediction') {
            console.log(`Detected: ${data.data.species} (${data.data.confidence})`);
        }
    };
    ```
    """
    await manager.connect(websocket)
    manager.subscribe_to_live_feed(websocket)

    await manager.send_status(websocket, {
        "connected": True,
        "subscription": "live_feed",
        "message": "Subscribed to all predictions"
    })

    try:
        while True:
            # Keep connection alive, handle client messages
            data = await websocket.receive_text()

            # Handle ping/pong for connection keep-alive
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/ws/device/{device_id}")
async def websocket_device_feed(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint for device-specific prediction feed.

    Receives predictions only from the specified device.

    Path Parameters:
    - device_id: The device ID to subscribe to
    """
    await manager.connect(websocket)
    manager.subscribe_to_device(websocket, device_id)

    await manager.send_status(websocket, {
        "connected": True,
        "subscription": "device",
        "device_id": device_id,
        "message": f"Subscribed to device {device_id}"
    })

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.websocket("/ws/stream")
async def websocket_audio_stream(
    websocket: WebSocket,
):
    """
    WebSocket endpoint for streaming audio and receiving predictions.

    This endpoint allows a device to:
    1. Send audio chunks via WebSocket
    2. Receive predictions in real-time

    Message format (send):
    ```json
    {
        "type": "audio",
        "device_id": "my-device",
        "timestamp_utc": "2025-11-29T12:00:00Z",
        "latitude": 52.52,
        "longitude": 13.405,
        "sample_rate": 16000,
        "audio_format": "pcm16_le",
        "audio_base64": "<base64-encoded-audio>"
    }
    ```

    Message format (receive):
    ```json
    {
        "type": "prediction",
        "data": { ... prediction data ... }
    }
    ```
    """
    await manager.connect(websocket)

    await manager.send_status(websocket, {
        "connected": True,
        "subscription": "stream",
        "message": "Ready to receive audio"
    })

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            if data == "ping":
                await websocket.send_text("pong")
                continue

            try:
                message = json.loads(data)

                if message.get("type") == "audio":
                    # Process audio chunk
                    request = AudioChunkRequest(
                        device_id=message["device_id"],
                        timestamp_utc=message["timestamp_utc"],
                        latitude=message.get("latitude"),
                        longitude=message.get("longitude"),
                        sample_rate=message["sample_rate"],
                        audio_format=message["audio_format"],
                        audio_base64=message["audio_base64"],
                    )

                    # Process prediction (without DB for WebSocket streaming)
                    service = PredictionService(db=None)
                    prediction = await service.process_audio_chunk(
                        request,
                        store_in_db=False
                    )

                    # Send prediction back to client
                    response = {
                        "type": "prediction",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {
                            "recording_id": str(prediction.recording_id),
                            "species": prediction.consensus.species_common,
                            "confidence": prediction.consensus.confidence,
                            "models": [
                                {
                                    "name": mp.model_name,
                                    "species": mp.predictions[0].species_common if mp.predictions else None,
                                    "confidence": mp.predictions[0].confidence if mp.predictions else 0
                                }
                                for mp in prediction.model_predictions
                            ]
                        }
                    }
                    await websocket.send_text(json.dumps(response))

                    # Also broadcast to subscribers
                    await manager.broadcast_prediction(prediction, message["device_id"])

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON"
                }))
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))

    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Export manager for use in prediction service
def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager."""
    return manager
