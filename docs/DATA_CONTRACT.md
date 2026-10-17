# MotionTwin — Sensor Telemetry Data Contract

## 1. Specification Overview

* **Protocol Version**: `1.0.0`
* **Transport**: WebSockets (JSON payload)
* **Ingestion Endpoint**: `ws://<server>:8000/ws/device?device_id=<id>`
* **Streaming Endpoint (Browsers)**: `ws://<server>:8000/ws/live`

---

## 2. Telemetry Packet JSON Schema

Each incoming telemetry packet represents a synchronized reading across the three tracked anatomical segments:

```json
{
  "version": "1.0.0",
  "device_id": "motiontwin-esp32-01",
  "timestamp_ms": 1728456789123,
  "sequence": 4182,
  "mode": "hardware",
  "sensors": {
    "chest": {
      "connected": true,
      "accel": { "x": 0.05, "y": 0.12, "z": 9.81 },
      "gyro": { "x": 0.002, "y": -0.015, "z": 0.001 },
      "euler_deg": { "roll": 1.2, "pitch": 18.5, "yaw": -3.4 },
      "quaternion": { "w": 0.986, "x": 0.015, "y": 0.160, "z": -0.027 },
      "calibration_status": 3,
      "data_valid": true
    },
    "torso": {
      "connected": true,
      "accel": { "x": 0.02, "y": 0.08, "z": 9.80 },
      "gyro": { "x": 0.001, "y": -0.008, "z": 0.000 },
      "euler_deg": { "roll": 0.8, "pitch": 11.2, "yaw": -2.1 },
      "quaternion": { "w": 0.995, "x": 0.008, "y": 0.097, "z": -0.018 },
      "calibration_status": 3,
      "data_valid": true
    },
    "pelvis": {
      "connected": true,
      "accel": { "x": 0.00, "y": 0.03, "z": 9.81 },
      "gyro": { "x": 0.000, "y": -0.003, "z": 0.000 },
      "euler_deg": { "roll": 0.2, "pitch": 4.1, "yaw": -0.8 },
      "quaternion": { "w": 0.999, "x": 0.002, "y": 0.036, "z": -0.007 },
      "calibration_status": 3,
      "data_valid": true
    }
  }
}
```

---

## 3. Field Definitions & Engineering Units

| Field | Type | Unit | Description |
| :--- | :--- | :--- | :--- |
| `version` | String | — | Protocol contract version (`1.0.0`). |
| `device_id` | String | — | Unique hardware gateway or simulation ID. |
| `timestamp_ms` | Integer | ms | Epoch timestamp recorded on device. |
| `sequence` | Integer | Counter | Monotonically increasing sequence ID (detects frame drops). |
| `mode` | String | — | `"hardware"` or `"simulation"`. |
| `sensors` | Object | — | Map containing `chest`, `torso`, and `pelvis` keys. |
| `sensors[<name>].connected` | Boolean | — | True if I²C sensor ACK was received. |
| `sensors[<name>].accel` | Vector3D | $\text{m/s}^2$ | Accelerometer reading in sensor body frame ($x, y, z$). |
| `sensors[<name>].gyro` | Vector3D | $\text{rad/s}$ | Gyroscope angular velocity ($x, y, z$). |
| `sensors[<name>].euler_deg` | EulerDeg | Degrees ($^\circ$) | Estimated Euler angles (`roll`, `pitch`, `yaw`). |
| `sensors[<name>].quaternion` | Quaternion | Unit-less | Normalized unit quaternion (`w`, `x`, `y`, `z`). |
| `sensors[<name>].calibration_status` | Integer | 0–3 | Calibration confidence (0: none, 3: optimal). |
| `sensors[<name>].data_valid` | Boolean | — | Flag indicating reading validity. |

---

## 4. Quaternion Ordering & Convention

* Component ordering is explicitly **Scalar-First**:
  $$Q = w + x\mathbf{i} + y\mathbf{j} + z\mathbf{k}$$
* Norm invariant:
  $$w^2 + x^2 + y^2 + z^2 = 1.0 \pm 0.001$$
* Any packet failing Pydantic validation or exceeding sequence limits is logged to diagnostics and flagged without crashing the ingestion loop.
