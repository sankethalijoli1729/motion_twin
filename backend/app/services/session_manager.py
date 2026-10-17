import asyncio
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session as DBSession
from app.models.session import Session
from app.models.sample import SensorSample
from app.schemas.sensor import DeviceTelemetryPacket
from app.database.session import SessionLocal

class SessionManager:
    def __init__(self):
        self.active_session_id: Optional[int] = None
        self.is_paused: bool = False
        self.sample_sequence_counter: int = 0
        self.buffer: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()
        self.last_flush_time: float = time.time()
        self.flush_interval: float = 0.5
        self.max_batch_size: int = 150
        self.total_recorded_samples: int = 0

    def get_status(self) -> Dict[str, Any]:
        return {
            "active_session_id": self.active_session_id,
            "is_recording": self.active_session_id is not None,
            "is_paused": self.is_paused,
            "sample_sequence": self.sample_sequence_counter,
            "buffered_samples": len(self.buffer),
            "total_recorded_samples": self.total_recorded_samples
        }

    async def start_session(self, session_data, db: DBSession) -> Session:
        async with self._lock:
            if self.active_session_id is not None:
                await self._flush_buffer_internal(db)
                # Mark previous as ended
                prev = db.query(Session).filter(Session.id == self.active_session_id).first()
                if prev:
                    prev.ended_at = datetime.utcnow()
                    db.commit()

            new_session = Session(
                device_id=session_data.device_id,
                session_name=session_data.session_name,
                activity_label=session_data.activity_label,
                data_source=session_data.data_source,
                started_at=datetime.utcnow(),
                sample_count=0,
                notes=session_data.notes
            )
            db.add(new_session)
            db.commit()
            db.refresh(new_session)

            self.active_session_id = new_session.id
            self.is_paused = False
            self.sample_sequence_counter = 0
            self.buffer = []
            self.total_recorded_samples = 0
            self.last_flush_time = time.time()
            return new_session

    async def pause_session(self) -> bool:
        async with self._lock:
            if self.active_session_id is not None and not self.is_paused:
                self.is_paused = True
                return True
            return False

    async def resume_session(self) -> bool:
        async with self._lock:
            if self.active_session_id is not None and self.is_paused:
                self.is_paused = False
                return True
            return False

    async def stop_session(self, db: DBSession) -> Optional[Session]:
        async with self._lock:
            if self.active_session_id is None:
                return None
            session_id = self.active_session_id
            await self._flush_buffer_internal(db)
            
            session = db.query(Session).filter(Session.id == session_id).first()
            if session:
                session.ended_at = datetime.utcnow()
                session.sample_count = self.total_recorded_samples
                db.commit()
                db.refresh(session)
            
            self.active_session_id = None
            self.is_paused = False
            self.buffer = []
            return session

    async def ingest_packet(self, packet: DeviceTelemetryPacket):
        """
        Ingest telemetry packet. If recording and not paused, add 3 IMU samples into buffer.
        Flushes buffer when batch size or interval reached.
        """
        if self.active_session_id is None or self.is_paused:
            return

        async with self._lock:
            self.sample_sequence_counter += 1
            now = datetime.utcnow()
            seq = self.sample_sequence_counter
            session_id = self.active_session_id

            for sensor_name, data in packet.sensors.items():
                if sensor_name not in ["chest", "torso", "pelvis"]:
                    continue
                self.buffer.append({
                    "session_id": session_id,
                    "device_timestamp_ms": packet.timestamp_ms,
                    "received_at": now,
                    "sample_sequence": seq,
                    "sensor_name": sensor_name,
                    "acceleration_x": data.accel.x,
                    "acceleration_y": data.accel.y,
                    "acceleration_z": data.accel.z,
                    "gyroscope_x": data.gyro.x,
                    "gyroscope_y": data.gyro.y,
                    "gyroscope_z": data.gyro.z,
                    "quaternion_w": data.quaternion.w,
                    "quaternion_x": data.quaternion.x,
                    "quaternion_y": data.quaternion.y,
                    "quaternion_z": data.quaternion.z,
                    "roll_deg": data.euler_deg.roll,
                    "pitch_deg": data.euler_deg.pitch,
                    "yaw_deg": data.euler_deg.yaw,
                    "data_valid": data.data_valid
                })
                self.total_recorded_samples += 1

            if len(self.buffer) >= self.max_batch_size or (time.time() - self.last_flush_time) >= self.flush_interval:
                # Flush in worker thread to prevent blocking event loop
                await self._flush_buffer_async()

    async def _flush_buffer_async(self):
        if not self.buffer:
            return
        to_insert = self.buffer[:]
        self.buffer = []
        self.last_flush_time = time.time()
        session_id = self.active_session_id
        count = self.total_recorded_samples

        def do_insert():
            db = SessionLocal()
            try:
                db.bulk_insert_mappings(SensorSample, to_insert)
                if session_id:
                    sess = db.query(Session).filter(Session.id == session_id).first()
                    if sess:
                        sess.sample_count = count
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"[SessionManager] Flush error: {e}")
            finally:
                db.close()

        await asyncio.to_thread(do_insert)

    async def _flush_buffer_internal(self, db: DBSession):
        if not self.buffer:
            return
        try:
            db.bulk_insert_mappings(SensorSample, self.buffer)
            if self.active_session_id:
                sess = db.query(Session).filter(Session.id == self.active_session_id).first()
                if sess:
                    sess.sample_count = self.total_recorded_samples
            db.commit()
            self.buffer = []
            self.last_flush_time = time.time()
        except Exception as e:
            db.rollback()
            print(f"[SessionManager] Internal flush error: {e}")

session_manager = SessionManager()
