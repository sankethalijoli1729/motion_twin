from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), unique=True, index=True, nullable=False)
    display_name = Column(String(128), nullable=False, default="ESP32 Gateway")
    hardware_type = Column(String(64), default="ESP32-3xMPU6050")
    firmware_version = Column(String(32), default="v1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(32), default="offline")  # online, offline, simulation

    sessions = relationship("Session", back_populates="device", cascade="all, delete-orphan")
