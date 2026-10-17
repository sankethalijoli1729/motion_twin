import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.connection_manager import connection_manager
from app.schemas.sensor import DeviceTelemetryPacket
from pydantic import ValidationError

router = APIRouter()

@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for frontend clients to receive real-time 3-IMU telemetry.
    """
    await connection_manager.connect_live(websocket)
    try:
        while True:
            # Keep connection alive; accept any control commands from frontend if sent
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        connection_manager.disconnect_live(websocket)
    except Exception as e:
        connection_manager.disconnect_live(websocket)

@router.websocket("/ws/device")
async def websocket_device_endpoint(
    websocket: WebSocket,
    device_id: str = Query(default="esp32-motiontwin-01")
):
    """
    WebSocket endpoint for ESP32 hardware gateway or external collectors to ingest telemetry.
    """
    await connection_manager.connect_device(websocket, device_id)
    try:
        while True:
            message_text = await websocket.receive_text()
            try:
                payload = json.loads(message_text)
                # Validate according to contract
                packet = DeviceTelemetryPacket(**payload)
                await connection_manager.broadcast_telemetry(packet)
            except ValidationError as ve:
                connection_manager.invalid_packet_count += 1
                connection_manager.add_log("WARN", f"Invalid sensor packet format from {device_id}: {ve.errors()[0]['msg']}")
            except json.JSONDecodeError:
                connection_manager.invalid_packet_count += 1
                connection_manager.add_log("ERROR", f"Malformed JSON packet received from {device_id}")
            except Exception as e:
                connection_manager.add_log("ERROR", f"Error processing device packet: {str(e)}")

    except WebSocketDisconnect:
        connection_manager.disconnect_device(websocket)
    except Exception as e:
        connection_manager.disconnect_device(websocket)
