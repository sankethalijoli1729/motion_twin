from sqlalchemy import Column, Integer, BigInteger, Float, Boolean, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class SensorSample(Base):
    __tablename__ = "sensor_samples"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    device_timestamp_ms = Column(BigInteger, nullable=False)
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sample_sequence = Column(BigInteger, nullable=False, index=True)
    sensor_name = Column(String(32), nullable=False, index=True)  # chest, torso, pelvis
    
    # Kinematics
    acceleration_x = Column(Float, nullable=False, default=0.0)
    acceleration_y = Column(Float, nullable=False, default=0.0)
    acceleration_z = Column(Float, nullable=False, default=0.0)
    gyroscope_x = Column(Float, nullable=False, default=0.0)
    gyroscope_y = Column(Float, nullable=False, default=0.0)
    gyroscope_z = Column(Float, nullable=False, default=0.0)
    quaternion_w = Column(Float, nullable=False, default=1.0)
    quaternion_x = Column(Float, nullable=False, default=0.0)
    quaternion_y = Column(Float, nullable=False, default=0.0)
    quaternion_z = Column(Float, nullable=False, default=0.0)
    roll_deg = Column(Float, nullable=False, default=0.0)
    pitch_deg = Column(Float, nullable=False, default=0.0)
    yaw_deg = Column(Float, nullable=False, default=0.0)
    data_valid = Column(Boolean, nullable=False, default=True)

    session = relationship("Session", back_populates="samples")

    __table_args__ = (
        Index("idx_session_sensor_time", "session_id", "sensor_name", "device_timestamp_ms"),
        Index("idx_session_seq", "session_id", "sample_sequence"),
    )
