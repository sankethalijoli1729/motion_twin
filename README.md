# MotionTwin — Real-Time Inertial Human Motion Digital Twin

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=flat&logo=threedotjs)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![ESP32](https://img.shields.io/badge/Hardware-ESP32%20%7C%20MPU6050-E7352C?style=flat&logo=espressif)](https://www.espressif.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **MotionTwin** is a high-performance, real-time biomechanical digital twin and kinematics analytics platform. It fuses multi-node inertial measurement unit (IMU) data via an ESP32 gateway, drives an interactive 3D human mannequin at up to 50 Hz with quaternion-based kinematics and Slerp interpolation, and logs telemetry for synchronous historical replay and biomechanical diagnostics.

---

## 1. System Architecture

```
[ PHYSICAL SENSORS ]
  ├─ IMU 1: Upper Chest (0x68 via TCA Ch 0)
  ├─ IMU 2: Lower Torso (0x68 via TCA Ch 1)
  └─ IMU 3: Pelvis Base (0x68 via TCA Ch 2)
                 │
           [ TCA9548A Multiplexer (0x70) ]
                 │ (I2C Fast Mode 400kHz)
           [ ESP32-S3 Gateway ]
                 │ (Wi-Fi WebSockets @ 30-50 Hz)
                 ▼
[ FASTAPI BACKEND GATEWAY (:8000) ]
  ├── WebSockets: /ws/live (Frontend) & /ws/device (Hardware Ingestion)
  ├── Kinematic Engine: Quaternion math, Slerp, Aerospace Euler conversions
  ├── Background Simulation Engine: 8 preset motion patterns + manual sliders
  ├── Session Buffer & Asynchronous DB Flush
  └── SQLite / PostgreSQL Database (Alembic Migrations)
                 │
                 ▼
[ REACT THREE FIBER FRONTEND (:5173) ]
  ├── Interactive 3D Human Digital Twin (3-DOF Segment Hierarchy)
  ├── Live Telemetry HUD (Euler, Quaternions, Accel, Gyro, Packet Gaps)
  ├── Historical Motion Replay Player (Timeline Scrubber, Speed 0.25x-2x)
  ├── Motion Analytics (Multi-segment correlation, velocity distributions)
  └── Hardware Diagnostics Lab & Device Settings
```

---

## 2. Key Features

1. **Continuous 3D Biomechanical Avatar**:
   * Articulated procedural 3D human mannequin using React Three Fiber and Three.js geometry.
   * Direct quaternion-driven joint orientation for Thoracic Spine (Chest), Lumbar Spine (Torso), and Pelvis (Root Base).
   * Spherical Linear Interpolation (Slerp) with configurable smoothing factor to prevent packet jitter.
   * Camera viewing presets: Front, Rear, Side, Top, and free OrbitControls.
   * Visual toggles for IMU sensor nodes, skeletal column, and reference axes.
   * Software zero-calibration button to tare wearable harness offsets.

2. **Dual-Mode Operation (Simulation & Real Hardware)**:
   * **Simulation Mode**: Generates mathematically consistent synthetic kinematic motion without hardware (Standing micro-sway, Forward Lean, Backward Extension, Lateral Tilt, Torso Twist, Walking Gait, and Manual Angle Sliders).
   * **Live Hardware Mode**: Connects ESP32 microcontroller streaming live MPU-6050 readings over WebSockets.

3. **Persistent Recording & Session Storage**:
   * Start, pause, resume, and stop recording runs.
   * High-throughput asynchronous batch inserts ensuring the WebSocket broadcast remains uninterrupted.
   * Retains full session records across server and database restarts.

4. **Synchronized Historical Motion Replay**:
   * Scrubber timeline with current timestamp and frame cursor.
   * Variable playback rates (0.25x, 0.5x, 1x, 2x).
   * Synchronized orientation charts following the scrubber position.

5. **Motion Analytics & Sensor Diagnostics**:
   * Multi-segment inter-joint angular delta correlation.
   * Angular velocity histograms and peak rotational velocities.
   * CSV and JSON data export.
   * Diagnostic ring-buffer log with sequence gap detection and I²C channel integrity.

---

## 3. Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Three.js, React Three Fiber, @react-three/drei, Recharts, Zustand, React Router, Lucide Icons.
* **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0, Alembic, Pydantic v2, WebSockets, NumPy, SciPy.
* **Database**: SQLite (WAL mode for zero-configuration local persistence), PostgreSQL-compatible schema.
* **Embedded Firmware**: Arduino C++ for ESP32 with TCA9548A multiplexer and MPU-6050 sensor fusion.

---

## 4. Quick Start (Local Setup on Windows)

### Prerequisites
* Python 3.11+
* Node.js v20+ & npm

### Backend Setup & Execution
```powershell
# In project root:
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend API Swagger: `http://127.0.0.1:8000/docs`
* Health Check: `http://127.0.0.1:8000/api/health`

### Frontend Setup & Execution
```powershell
# Open a new terminal in project root:
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server
npm run dev
```
* Open your browser at: `http://127.0.0.1:5173`

---

## 5. Running with Docker Compose

```bash
docker-compose up --build
```
* Frontend: `http://localhost:5173`
* Backend: `http://localhost:8000`

---

## 6. Verification & Test Suite

### Run Backend Tests (Pytest)
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
```
* **Results**: 8 passed (Health check, device registration, session lifecycle, CSV/JSON export, quaternion normalization, Euler-quaternion roundtrip, Hamilton multiplication, Slerp interpolation).

### Run Frontend Tests (Vitest)
```powershell
cd frontend
npx vitest run
```
* **Results**: 4 passed (Zustand store connectivity, recording lifecycle, manual simulation sliders, zero-pose calibration).

---

## 7. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend and database status check |
| `GET` | `/api/devices` | List registered hardware gateways |
| `POST` | `/api/devices` | Register or update device |
| `GET` | `/api/sessions` | List recorded sessions with filters |
| `POST` | `/api/sessions` | Start a new persistent recording session |
| `POST` | `/api/sessions/pause` | Pause sample writing (telemetry stays live) |
| `POST` | `/api/sessions/resume` | Resume sample writing |
| `GET` | `/api/sessions/{id}` | Detailed session statistics |
| `POST` | `/api/sessions/{id}/stop` | Finalize and save active recording |
| `GET` | `/api/sessions/{id}/samples`| Retrieve stored timestamped samples |
| `GET` | `/api/sessions/{id}/export` | Download session as CSV or JSON |
| `DELETE`| `/api/sessions/{id}` | Delete recorded session |
| `GET` | `/api/diagnostics` | System health, packet rates, logs |
| `POST` | `/api/simulation/control`| Update simulation patterns or manual angles |
| `WS` | `/ws/live` | Real-time browser telemetry broadcast |
| `WS` | `/ws/device` | Hardware ESP32 ingestion gateway |

---

## 8. Limitations & Engineering Roadmap

* **Absolute Position Tracking**: 3 IMUs provide rotational orientation (3-DOF per segment); they do not provide 3D Cartesian position ($X, Y, Z$) in room coordinates without external optical or UWB anchors.
* **Heading Drift**: Without a 3-axis magnetometer, raw yaw slowly integrates gyro drift over long sessions. The platform provides continuous differential inter-segment angles and single-click zeroing.
* **Future Expansion**: Support for limb tracking (arms/legs) by extending the TCA9548A multiplexer channels or switching to ESP-NOW mesh nodes.
