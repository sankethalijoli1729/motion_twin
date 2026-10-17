import math
from datetime import datetime, timedelta
from app.database.session import SessionLocal
from app.models.device import Device
from app.models.session import Session
from app.models.sample import SensorSample
from app.services.kinematics import euler_deg_to_quaternion

def seed_demo_data_if_needed():
    db = SessionLocal()
    try:
        # Check if sessions already exist
        if db.query(Session).count() > 0:
            return

        print("[Seed] Seeding realistic demo sessions for demonstration...")
        
        # Ensure device exists
        dev = db.query(Device).filter(Device.device_id == "motiontwin-gateway-01").first()
        if not dev:
            dev = Device(
                device_id="motiontwin-gateway-01",
                display_name="ESP32 Gateway (Lab Rig #1)",
                hardware_type="ESP32 + 3x MPU-6050",
                firmware_version="v1.2.0",
                status="online"
            )
            db.add(dev)
            db.commit()

        # Seed Demo Session 1: Trunk Flexion-Extension
        started_1 = datetime.utcnow() - timedelta(minutes=45)
        ended_1 = started_1 + timedelta(seconds=20)
        session_1 = Session(
            device_id="motiontwin-gateway-01",
            session_name="Trunk Flexion-Extension Dynamic Test",
            activity_label="forward_lean",
            data_source="simulation",
            started_at=started_1,
            ended_at=ended_1,
            sample_count=300, # 100 timesteps * 3 sensors
            notes="Evaluated kinematic progression across pelvis, lower torso, and upper chest during 35-degree forward flex."
        )
        db.add(session_1)
        db.commit()
        db.refresh(session_1)

        samples_1 = []
        for i in range(100):
            t = i * 0.2
            seq = i + 1
            wave = (math.sin(t * 1.5) + 1.0) * 0.5
            
            p_pelvis = wave * 10.0
            p_torso = wave * 22.0
            p_chest = wave * 35.0

            t_ms = int(started_1.timestamp() * 1000) + int(t * 1000)
            rec_at = started_1 + timedelta(seconds=t)

            for s_name, pitch in [("pelvis", p_pelvis), ("torso", p_torso), ("chest", p_chest)]:
                qw, qx, qy, qz = euler_deg_to_quaternion(0.0, pitch, 0.0)
                p_rad = math.radians(pitch)
                ax = -9.81 * math.sin(p_rad)
                ay = 0.0
                az = 9.81 * math.cos(p_rad)
                samples_1.append(SensorSample(
                    session_id=session_1.id,
                    device_timestamp_ms=t_ms,
                    received_at=rec_at,
                    sample_sequence=seq,
                    sensor_name=s_name,
                    acceleration_x=round(ax, 3),
                    acceleration_y=round(ay, 3),
                    acceleration_z=round(az, 3),
                    gyroscope_x=0.0,
                    gyroscope_y=round(math.cos(t * 1.5) * 0.45, 4),
                    gyroscope_z=0.0,
                    quaternion_w=round(qw, 4),
                    quaternion_x=round(qx, 4),
                    quaternion_y=round(qy, 4),
                    quaternion_z=round(qz, 4),
                    roll_deg=0.0,
                    pitch_deg=round(pitch, 2),
                    yaw_deg=0.0,
                    data_valid=True
                ))

        db.bulk_save_objects(samples_1)
        db.commit()

        # Seed Demo Session 2: Torso Axial Twist
        started_2 = datetime.utcnow() - timedelta(minutes=20)
        ended_2 = started_2 + timedelta(seconds=15)
        session_2 = Session(
            device_id="motiontwin-gateway-01",
            session_name="Axial Trunk Rotation & Yaw Analysis",
            activity_label="torso_twist",
            data_source="hardware",
            started_at=started_2,
            ended_at=ended_2,
            sample_count=225,
            notes="Measured sensor decoupled yaw rotation. Validated complementary filter tracking under 25 deg/s velocity."
        )
        db.add(session_2)
        db.commit()
        db.refresh(session_2)

        samples_2 = []
        for i in range(75):
            t = i * 0.2
            seq = i + 1
            wave = math.sin(t * 1.4)
            y_pelvis = wave * 6.0
            y_torso = wave * 18.0
            y_chest = wave * 32.0

            t_ms = int(started_2.timestamp() * 1000) + int(t * 1000)
            rec_at = started_2 + timedelta(seconds=t)

            for s_name, yaw in [("pelvis", y_pelvis), ("torso", y_torso), ("chest", y_chest)]:
                qw, qx, qy, qz = euler_deg_to_quaternion(0.0, 0.0, yaw)
                samples_2.append(SensorSample(
                    session_id=session_2.id,
                    device_timestamp_ms=t_ms,
                    received_at=rec_at,
                    sample_sequence=seq,
                    sensor_name=s_name,
                    acceleration_x=0.0,
                    acceleration_y=0.0,
                    acceleration_z=9.81,
                    gyroscope_x=0.0,
                    gyroscope_y=0.0,
                    gyroscope_z=round(math.cos(t * 1.4) * 0.65, 4),
                    quaternion_w=round(qw, 4),
                    quaternion_x=round(qx, 4),
                    quaternion_y=round(qy, 4),
                    quaternion_z=round(qz, 4),
                    roll_deg=0.0,
                    pitch_deg=0.0,
                    yaw_deg=round(yaw, 2),
                    data_valid=True
                ))

        db.bulk_save_objects(samples_2)
        db.commit()
        print("[Seed] Seeded 2 demo sessions with historical samples successfully.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding demo data: {e}")
    finally:
        db.close()
