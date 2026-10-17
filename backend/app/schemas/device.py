from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DeviceCreate(BaseModel):
    device_id: str
    display_name: str
    hardware_type: str = "ESP32-3xMPU6050"
    firmware_version: str = "v1.0.0"

class DeviceOut(BaseModel):
    id: int
    device_id: str
    display_name: str
    hardware_type: str
    firmware_version: str
    created_at: datetime
    last_seen_at: datetime
    status: str

    class Config:
        from_attributes = True
