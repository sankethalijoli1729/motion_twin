import asyncio
import json
import time
from typing import List, Dict, Any, Optional
from fastapi import WebSocket
from app.schemas.sensor import DeviceTelemetryPacket
from app.services.session_manager import session_manager

class ConnectionManager:
    def __init__(self):
        # WebSockets connected to /ws/live (Frontend browsers)
        self.live_clients: List[WebSocket] = []
        # WebSockets connected to /ws/device (ESP32 hardware or simulation clients)
        self.device_clients: List[WebSocket] = []
        
        # Telemetry Diagnostics State
        self.last_packet: Optional[Dict[str, Any]] = None
        self.last_packet_time: float = 0.0
        self.total_packets_received: int = 0
        self.total_packets_sent: int = 0
        self.packet_rate_hz: float = 0.0
        self._rate_window_count: int = 0
        self._rate_window_start: float = time.time()
        self.last_sequence: int = -1
        self.missing_sequences: int = 0
        self.invalid_packet_count: int = 0
        self.reconnect_count: int = 0
        self.device_mode: str = "simulation"
        self.device_id: str = "motiontwin-gateway-01"
        self.device_status: str = "standby" # online, standby, offline
        self.recent_logs: List[Dict[str, Any]] = []
        self.max_logs: int = 100

    def add_log(self, level: str, message: str):
        log_entry = {
            "timestamp": time.strftime("%H:%M:%S"),
            "level": level.upper(), # INFO, WARN, ERROR, SUCCESS
            "message": message
        }
        self.recent_logs.append(log_entry)
        if len(self.recent_logs) > self.max_logs:
            self.recent_logs.pop(0)

    async def connect_live(self, websocket: WebSocket):
        await websocket.accept()
        self.live_clients.append(websocket)
        self.add_log("INFO", f"Frontend client connected. Total clients: {len(self.live_clients)}")
        # Send current state immediately
        if self.last_packet:
            try:
                await websocket.send_text(json.dumps({
                    "type": "telemetry",
                    "data": self.last_packet
                }))
            except Exception:
                pass

    def disconnect_live(self, websocket: WebSocket):
        if websocket in self.live_clients:
            self.live_clients.remove(websocket)
            self.add_log("INFO", f"Frontend client disconnected. Remaining: {len(self.live_clients)}")

    async def connect_device(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.device_clients.append(websocket)
        self.device_id = client_id
        self.device_status = "online"
        self.device_mode = "hardware"
        self.reconnect_count += 1
        self.add_log("SUCCESS", f"Hardware ESP32 '{client_id}' connected via WebSocket.")

    def disconnect_device(self, websocket: WebSocket):
        if websocket in self.device_clients:
            self.device_clients.remove(websocket)
            if not self.device_clients:
                self.device_status = "offline"
                self.add_log("WARN", "Hardware ESP32 disconnected.")

    async def broadcast_telemetry(self, packet: DeviceTelemetryPacket):
        now = time.time()
        self.total_packets_received += 1
        self._rate_window_count += 1
        
        # Calculate rolling Hz every 1 second
        elapsed = now - self._rate_window_start
        if elapsed >= 1.0:
            self.packet_rate_hz = round(self._rate_window_count / elapsed, 1)
            self._rate_window_count = 0
            self._rate_window_start = now

        # Sequence gap check
        if self.last_sequence != -1 and packet.sequence > self.last_sequence + 1:
            gaps = packet.sequence - (self.last_sequence + 1)
            self.missing_sequences += gaps
            self.add_log("WARN", f"Detected {gaps} dropped/missing packet(s) (seq {self.last_sequence} -> {packet.sequence})")
        self.last_sequence = packet.sequence

        packet.server_received_ms = int(now * 1000)
        packet_dict = packet.model_dump()
        self.last_packet = packet_dict
        self.last_packet_time = now
        self.device_mode = packet.mode
        self.device_id = packet.device_id

        # Ingest for persistent recording if active
        await session_manager.ingest_packet(packet)

        # Broadcast to all frontend clients
        if self.live_clients:
            payload = json.dumps({
                "type": "telemetry",
                "data": packet_dict,
                "meta": {
                    "rate_hz": self.packet_rate_hz,
                    "missing_sequences": self.missing_sequences,
                    "invalid_packets": self.invalid_packet_count,
                    "recording": session_manager.get_status()
                }
            })
            dead_clients = []
            for client in self.live_clients:
                try:
                    await client.send_text(payload)
                    self.total_packets_sent += 1
                except Exception:
                    dead_clients.append(client)
            for dead in dead_clients:
                self.disconnect_live(dead)

    def get_diagnostics(self) -> Dict[str, Any]:
        now = time.time()
        stale = (now - self.last_packet_time > 2.5) if self.last_packet_time > 0 else True
        return {
            "device_id": self.device_id,
            "device_mode": self.device_mode,
            "device_status": "offline" if stale else ("online" if self.device_status == "online" else "simulation"),
            "connected_frontends": len(self.live_clients),
            "connected_hardware": len(self.device_clients),
            "packet_rate_hz": self.packet_rate_hz if not stale else 0.0,
            "total_packets_received": self.total_packets_received,
            "missing_sequences": self.missing_sequences,
            "invalid_packet_count": self.invalid_packet_count,
            "reconnect_count": self.reconnect_count,
            "last_packet_age_ms": round((now - self.last_packet_time) * 1000, 1) if self.last_packet_time > 0 else None,
            "recording_status": session_manager.get_status(),
            "logs": self.recent_logs[-50:]
        }

connection_manager = ConnectionManager()
