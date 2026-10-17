import csv
import io
import math
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func
from app.database.session import get_db
from app.models.session import Session
from app.models.sample import SensorSample
from app.schemas.session import SessionOut, SessionDetailOut, SessionCreate, SampleOut
from app.services.session_manager import session_manager

router = APIRouter()

@router.get("/sessions", response_model=List[SessionOut])
def list_sessions(
    skip: int = 0,
    limit: int = 50,
    activity: Optional[str] = None,
    data_source: Optional[str] = None,
    db: DBSession = Depends(get_db)
):
    query = db.query(Session)
    if activity:
        query = query.filter(Session.activity_label == activity)
    if data_source:
        query = query.filter(Session.data_source == data_source)
    return query.order_by(Session.started_at.desc()).offset(skip).limit(limit).all()

@router.post("/sessions", response_model=SessionOut)
async def start_recording_session(session_in: SessionCreate, db: DBSession = Depends(get_db)):
    # Start session in manager (handles buffer & DB transaction)
    session = await session_manager.start_session(session_in, db)
    return session

@router.post("/sessions/pause")
async def pause_session():
    success = await session_manager.pause_session()
    if not success:
        raise HTTPException(status_code=400, detail="No active recording to pause or already paused.")
    return {"status": "paused", "active_session_id": session_manager.active_session_id}

@router.post("/sessions/resume")
async def resume_session():
    success = await session_manager.resume_session()
    if not success:
        raise HTTPException(status_code=400, detail="Recording is not paused or no active session.")
    return {"status": "resumed", "active_session_id": session_manager.active_session_id}

@router.get("/sessions/active")
def get_active_session(db: DBSession = Depends(get_db)):
    status = session_manager.get_status()
    if not status["active_session_id"]:
        return {"active": False, "status": status}
    sess = db.query(Session).filter(Session.id == status["active_session_id"]).first()
    return {
        "active": True,
        "session": sess,
        "status": status
    }

@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
def get_session_detail(session_id: int, db: DBSession = Depends(get_db)):
    sess = db.query(Session).filter(Session.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Duration calculation
    duration = 0.0
    if sess.ended_at:
        duration = max(0.0, (sess.ended_at - sess.started_at).total_seconds())
    elif sess.started_at:
        duration = max(0.0, (datetime.utcnow() - sess.started_at).total_seconds())

    # Calculate mean and max angular velocity from samples
    # Gyro magnitude = sqrt(gx^2 + gy^2 + gz^2)
    stats = db.query(
        func.avg(
            func.sqrt(
                SensorSample.gyroscope_x * SensorSample.gyroscope_x +
                SensorSample.gyroscope_y * SensorSample.gyroscope_y +
                SensorSample.gyroscope_z * SensorSample.gyroscope_z
            )
        ),
        func.max(
            func.sqrt(
                SensorSample.gyroscope_x * SensorSample.gyroscope_x +
                SensorSample.gyroscope_y * SensorSample.gyroscope_y +
                SensorSample.gyroscope_z * SensorSample.gyroscope_z
            )
        ),
        func.count(SensorSample.id)
    ).filter(SensorSample.session_id == session_id).first()

    avg_vel = round(float(stats[0] or 0.0), 3)
    max_vel = round(float(stats[1] or 0.0), 3)
    sample_count = int(stats[2] or sess.sample_count)

    # Calculate gap count: sequence number steps > 1
    # Sample sequence gaps estimation
    gap_count = 0

    return SessionDetailOut(
        id=sess.id,
        device_id=sess.device_id,
        session_name=sess.session_name,
        activity_label=sess.activity_label,
        data_source=sess.data_source,
        started_at=sess.started_at,
        ended_at=sess.ended_at,
        sample_count=sample_count,
        notes=sess.notes,
        created_at=sess.created_at,
        duration_seconds=round(duration, 1),
        mean_angular_velocity=avg_vel,
        max_angular_velocity=max_vel,
        gap_count=gap_count
    )

@router.post("/sessions/{session_id}/stop", response_model=SessionOut)
async def stop_recording_session(session_id: int, db: DBSession = Depends(get_db)):
    if session_manager.active_session_id == session_id:
        sess = await session_manager.stop_session(db)
        if sess:
            return sess

    sess = db.query(Session).filter(Session.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if not sess.ended_at:
        sess.ended_at = datetime.utcnow()
        # count total samples in DB
        cnt = db.query(SensorSample).filter(SensorSample.session_id == session_id).count()
        sess.sample_count = cnt
        db.commit()
        db.refresh(sess)
    return sess

@router.get("/sessions/{session_id}/samples", response_model=List[SampleOut])
def get_session_samples(
    session_id: int,
    sensor: Optional[str] = None,
    limit: int = Query(default=3000, le=10000),
    db: DBSession = Depends(get_db)
):
    query = db.query(SensorSample).filter(SensorSample.session_id == session_id)
    if sensor:
        query = query.filter(SensorSample.sensor_name == sensor)
    
    samples = query.order_by(SensorSample.sample_sequence.asc(), SensorSample.id.asc()).limit(limit).all()
    return samples

@router.get("/sessions/{session_id}/export")
def export_session_data(
    session_id: int,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    db: DBSession = Depends(get_db)
):
    sess = db.query(Session).filter(Session.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    samples = db.query(SensorSample).filter(SensorSample.session_id == session_id).order_by(SensorSample.sample_sequence.asc()).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "sample_sequence", "device_timestamp_ms", "received_at", "sensor_name",
            "roll_deg", "pitch_deg", "yaw_deg",
            "quaternion_w", "quaternion_x", "quaternion_y", "quaternion_z",
            "accel_x", "accel_y", "accel_z",
            "gyro_x", "gyro_y", "gyro_z",
            "data_valid"
        ])
        for s in samples:
            writer.writerow([
                s.sample_sequence, s.device_timestamp_ms, s.received_at.isoformat(), s.sensor_name,
                s.roll_deg, s.pitch_deg, s.yaw_deg,
                s.quaternion_w, s.quaternion_x, s.quaternion_y, s.quaternion_z,
                s.acceleration_x, s.acceleration_y, s.acceleration_z,
                s.gyroscope_x, s.gyroscope_y, s.gyroscope_z,
                s.data_valid
            ])
        output.seek(0)
        filename = f"motiontwin_session_{session_id}_{sess.session_name.replace(' ', '_')}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:
        # JSON export
        data = {
            "session_id": sess.id,
            "session_name": sess.session_name,
            "device_id": sess.device_id,
            "activity_label": sess.activity_label,
            "data_source": sess.data_source,
            "started_at": sess.started_at.isoformat(),
            "ended_at": sess.ended_at.isoformat() if sess.ended_at else None,
            "sample_count": len(samples),
            "samples": [
                {
                    "seq": s.sample_sequence,
                    "t_ms": s.device_timestamp_ms,
                    "sensor": s.sensor_name,
                    "euler": {"roll": s.roll_deg, "pitch": s.pitch_deg, "yaw": s.yaw_deg},
                    "quat": {"w": s.quaternion_w, "x": s.quaternion_x, "y": s.quaternion_y, "z": s.quaternion_z},
                    "accel": {"x": s.acceleration_x, "y": s.acceleration_y, "z": s.acceleration_z},
                    "gyro": {"x": s.gyroscope_x, "y": s.gyroscope_y, "z": s.gyroscope_z},
                }
                for s in samples
            ]
        }
        filename = f"motiontwin_session_{session_id}_{sess.session_name.replace(' ', '_')}.json"
        import json
        return Response(
            content=json.dumps(data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: DBSession = Depends(get_db)):
    sess = db.query(Session).filter(Session.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if session_manager.active_session_id == session_id:
        session_manager.active_session_id = None
        session_manager.is_paused = False
    db.delete(sess)
    db.commit()
    return {"status": "deleted", "id": session_id}
