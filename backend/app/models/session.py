from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), ForeignKey("devices.device_id"), index=True, nullable=False)
    session_name = Column(String(128), nullable=False)
    activity_label = Column(String(64), nullable=False, default="general_motion")
    data_source = Column(String(32), nullable=False, default="simulation")  # simulation or hardware
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    sample_count = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    device = relationship("Device", back_populates="sessions")
    samples = relationship("SensorSample", back_populates="session", cascade="all, delete-orphan")
