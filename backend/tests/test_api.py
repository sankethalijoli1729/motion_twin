import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["database"] == "healthy"

def test_devices_list():
    res = client.get("/api/devices")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_sessions_lifecycle_and_export():
    # 1. Start session
    payload = {
        "device_id": "motiontwin-gateway-01",
        "session_name": "Automated Pytest Run",
        "activity_label": "testing",
        "data_source": "simulation",
        "notes": "Testing session lifecycle"
    }
    create_res = client.post("/api/sessions", json=payload)
    assert create_res.status_code == 200
    sess = create_res.json()
    sess_id = sess["id"]
    assert sess["session_name"] == "Automated Pytest Run"

    # 2. Pause session
    pause_res = client.post("/api/sessions/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 3. Resume session
    resume_res = client.post("/api/sessions/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "resumed"

    # 4. Stop session
    stop_res = client.post(f"/api/sessions/{sess_id}/stop")
    assert stop_res.status_code == 200
    stopped_sess = stop_res.json()
    assert stopped_sess["ended_at"] is not None

    # 5. Detail
    detail_res = client.get(f"/api/sessions/{sess_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == sess_id

    # 6. CSV Export
    csv_res = client.get(f"/api/sessions/{sess_id}/export?format=csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")

    # 7. JSON Export
    json_res = client.get(f"/api/sessions/{sess_id}/export?format=json")
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers.get("content-type", "")

    # 8. Clean up delete
    del_res = client.delete(f"/api/sessions/{sess_id}")
    assert del_res.status_code == 200

def test_diagnostics():
    res = client.get("/api/diagnostics")
    assert res.status_code == 200
    data = res.json()
    assert "packet_rate_hz" in data
    assert "device_mode" in data
