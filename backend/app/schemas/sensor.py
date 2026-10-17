from pydantic import BaseModel, Field
from typing import Dict, Optional

class Vector3D(BaseModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class EulerDeg(BaseModel):
    roll: float = 0.0
    pitch: float = 0.0
    yaw: float = 0.0

class Quaternion(BaseModel):
    w: float = 1.0
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

class SensorPayload(BaseModel):
    connected: bool = True
    accel: Vector3D = Field(default_factory=Vector3D)
    gyro: Vector3D = Field(default_factory=Vector3D)
    euler_deg: EulerDeg = Field(default_factory=EulerDeg)
    quaternion: Quaternion = Field(default_factory=Quaternion)
    calibration_status: int = 3  # 0: Uncalibrated, 1: Low, 2: Medium, 3: High
    data_valid: bool = True

class DeviceTelemetryPacket(BaseModel):
    version: str = "1.0.0"
    device_id: str = "motiontwin-gateway-01"
    timestamp_ms: int
    sequence: int = 0
    mode: str = "simulation"  # "simulation" or "hardware"
    sensors: Dict[str, SensorPayload]
    server_received_ms: Optional[int] = None

class SimulatedMotionCommand(BaseModel):
    pattern: str = "standing"  # standing, forward_lean, backward_lean, left_tilt, right_tilt, torso_twist, walking_sway, manual
    chest_roll: Optional[float] = None
    chest_pitch: Optional[float] = None
    chest_yaw: Optional[float] = None
    torso_roll: Optional[float] = None
    torso_pitch: Optional[float] = None
    torso_yaw: Optional[float] = None
    pelvis_roll: Optional[float] = None
    pelvis_pitch: Optional[float] = None
    pelvis_yaw: Optional[float] = None
    speed_hz: Optional[int] = 30
