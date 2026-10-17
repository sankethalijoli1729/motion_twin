from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SessionCreate(BaseModel):
    device_id: str = "motiontwin-gateway-01"
    session_name: str
    activity_label: str = "general_motion"
    data_source: str = "simulation"
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    session_name: Optional[str] = None
    activity_label: Optional[str] = None
    notes: Optional[str] = None

class SampleOut(BaseModel):
    id: int
    session_id: int
    device_timestamp_ms: int
    sample_sequence: int
    sensor_name: str
    acceleration_x: float
    acceleration_y: float
    acceleration_z: float
    gyroscope_x: float
    gyroscope_y: float
    gyroscope_z: float
    quaternion_w: float
    quaternion_x: float
    quaternion_y: float
    quaternion_z: float
    roll_deg: float
    pitch_deg: float
    yaw_deg: float
    data_valid: bool

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id: int
    device_id: str
    session_name: str
    activity_label: str
    data_source: str
    started_at: datetime
    ended_at: Optional[datetime]
    sample_count: int
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class SessionDetailOut(SessionOut):
    duration_seconds: float = 0.0
    mean_angular_velocity: float = 0.0
    max_angular_velocity: float = 0.0
    gap_count: int = 0
