from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database.session import get_db
from app.models.device import Device
from app.schemas.device import DeviceOut, DeviceCreate

router = APIRouter()

@router.get("/devices", response_model=List[DeviceOut])
def list_devices(db: Session = Depends(get_db)):
    # Auto-seed default gateway if none exists
    default_dev = db.query(Device).filter(Device.device_id == "motiontwin-gateway-01").first()
    if not default_dev:
        default_dev = Device(
            device_id="motiontwin-gateway-01",
            display_name="ESP32 Multi-IMU Gateway",
            hardware_type="ESP32 + 3x MPU-6050",
            firmware_version="v1.2.0",
            status="online"
        )
        db.add(default_dev)
        db.commit()

    # Also seed simulation virtual device
    sim_dev = db.query(Device).filter(Device.device_id == "motiontwin-sim-01").first()
    if not sim_dev:
        sim_dev = Device(
            device_id="motiontwin-sim-01",
            display_name="Kinematic Virtual Simulator",
            hardware_type="Virtual Synthetic IMU",
            firmware_version="v1.0.0",
            status="simulation"
        )
        db.add(sim_dev)
        db.commit()

    return db.query(Device).order_by(Device.last_seen_at.desc()).all()

@router.post("/devices", response_model=DeviceOut)
def register_or_update_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    dev = db.query(Device).filter(Device.device_id == device_in.device_id).first()
    if not dev:
        dev = Device(
            device_id=device_in.device_id,
            display_name=device_in.display_name,
            hardware_type=device_in.hardware_type,
            firmware_version=device_in.firmware_version,
            status="online",
            last_seen_at=datetime.utcnow()
        )
        db.add(dev)
    else:
        dev.display_name = device_in.display_name
        dev.hardware_type = device_in.hardware_type
        dev.firmware_version = device_in.firmware_version
        dev.last_seen_at = datetime.utcnow()
        dev.status = "online"
    db.commit()
    db.refresh(dev)
    return dev
