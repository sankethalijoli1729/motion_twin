import asyncio
import json
import httpx
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"
WS_URL = "ws://127.0.0.1:8000/ws/live"

async def test_all():
    print("[1/6] Testing Backend Health & Endpoints...")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BACKEND_URL}/api/health")
        assert res.status_code == 200
        print("  -> Health OK:", res.json())

        res = await client.get(f"{BACKEND_URL}/api/devices")
        assert res.status_code == 200
        print("  -> Devices OK:", [d["device_id"] for d in res.json()])

    print("[2/6] Testing Frontend Web Server...")
    async with httpx.AsyncClient() as client:
        res = await client.get(FRONTEND_URL)
        assert res.status_code == 200
        assert "MotionTwin" in res.text
        print("  -> Frontend serves HTML index with MotionTwin title (200 OK)")

    print("[3/6] Testing Live Telemetry WebSocket Stream (/ws/live)...")
    async with websockets.connect(WS_URL) as ws:
        msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        data = json.loads(msg)
        assert data.get("type") == "telemetry"
        packet = data.get("data")
        assert "sensors" in packet
        assert "chest" in packet["sensors"]
        assert "torso" in packet["sensors"]
        assert "pelvis" in packet["sensors"]
        print(f"  -> WebSocket Telemetry Stream Verified! Received seq={packet.get('sequence')} mode={packet.get('mode')}")
        print(f"     Chest Pitch={packet['sensors']['chest']['euler_deg']['pitch']}° | Torso={packet['sensors']['torso']['euler_deg']['pitch']}° | Pelvis={packet['sensors']['pelvis']['euler_deg']['pitch']}°")

    print("[4/6] Testing Recording Session Lifecycle (Start -> Pause -> Resume -> Stop)...")
    async with httpx.AsyncClient() as client:
        # Start
        res = await client.post(f"{BACKEND_URL}/api/sessions", json={
            "device_id": "motiontwin-sim-01",
            "session_name": "Full E2E Validation Recording",
            "activity_label": "forward_lean",
            "data_source": "simulation",
            "notes": "Verified through automated E2E pipeline"
        })
        assert res.status_code == 200
        session_id = res.json()["id"]
        print(f"  -> Started Session ID #{session_id}")

        # Wait 2 seconds for sample ingestion
        await asyncio.sleep(2.0)

        # Pause
        res = await client.post(f"{BACKEND_URL}/api/sessions/pause")
        assert res.status_code == 200
        print("  -> Paused Session successfully")

        # Resume
        res = await client.post(f"{BACKEND_URL}/api/sessions/resume")
        assert res.status_code == 200
        print("  -> Resumed Session successfully")

        await asyncio.sleep(1.0)

        # Stop
        res = await client.post(f"{BACKEND_URL}/api/sessions/{session_id}/stop")
        assert res.status_code == 200
        print(f"  -> Stopped Session. Sample Count={res.json()['sample_count']}")

    print("[5/6] Testing Database Persistence & Export...")
    async with httpx.AsyncClient() as client:
        # Fetch samples
        res = await client.get(f"{BACKEND_URL}/api/sessions/{session_id}/samples")
        assert res.status_code == 200
        samples = res.json()
        assert len(samples) > 0
        print(f"  -> Successfully queried {len(samples)} persisted sensor samples from SQLite database!")

        # Export CSV
        res = await client.get(f"{BACKEND_URL}/api/sessions/{session_id}/export?format=csv")
        assert res.status_code == 200
        assert "sample_sequence" in res.text
        print(f"  -> CSV export generated ({len(res.text)} bytes)")

        # Export JSON
        res = await client.get(f"{BACKEND_URL}/api/sessions/{session_id}/export?format=json")
        assert res.status_code == 200
        export_data = res.json()
        assert "samples" in export_data
        print(f"  -> JSON export generated ({export_data['sample_count']} samples)")

    print("[6/6] Testing Simulation Control API...")
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{BACKEND_URL}/api/simulation/control", json={
            "pattern": "torso_twist",
            "speed_hz": 30
        })
        assert res.status_code == 200
        print("  -> Pattern changed to torso_twist (status: success)")

    print("\n==========================================")
    print(">>> ALL MOTIONTWIN E2E TESTS PASSED 100% <<<")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(test_all())
