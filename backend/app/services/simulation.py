import asyncio
import math
import time
import random
from typing import Dict, Any, Optional
from app.schemas.sensor import (
    DeviceTelemetryPacket,
    SensorPayload,
    Vector3D,
    EulerDeg,
    Quaternion,
    SimulatedMotionCommand
)
from app.services.kinematics import euler_deg_to_quaternion
from app.websocket.connection_manager import connection_manager

class SimulationEngine:
    def __init__(self):
        self.is_running: bool = False
        self.pattern: str = "standing"
        self.hz: int = 30
        self.sequence: int = 0
        self.device_id: str = "motiontwin-sim-01"
        self._task: Optional[asyncio.Task] = None
        
        # Manual target overrides
        self.manual_angles = {
            "chest": {"roll": 0.0, "pitch": 0.0, "yaw": 0.0},
            "torso": {"roll": 0.0, "pitch": 0.0, "yaw": 0.0},
            "pelvis": {"roll": 0.0, "pitch": 0.0, "yaw": 0.0},
        }

    def set_pattern(self, cmd: SimulatedMotionCommand):
        self.pattern = cmd.pattern
        if cmd.speed_hz:
            self.hz = max(5, min(100, cmd.speed_hz))
        if cmd.pattern == "manual":
            if cmd.chest_roll is not None: self.manual_angles["chest"]["roll"] = cmd.chest_roll
            if cmd.chest_pitch is not None: self.manual_angles["chest"]["pitch"] = cmd.chest_pitch
            if cmd.chest_yaw is not None: self.manual_angles["chest"]["yaw"] = cmd.chest_yaw
            
            if cmd.torso_roll is not None: self.manual_angles["torso"]["roll"] = cmd.torso_roll
            if cmd.torso_pitch is not None: self.manual_angles["torso"]["pitch"] = cmd.torso_pitch
            if cmd.torso_yaw is not None: self.manual_angles["torso"]["yaw"] = cmd.torso_yaw

            if cmd.pelvis_roll is not None: self.manual_angles["pelvis"]["roll"] = cmd.pelvis_roll
            if cmd.pelvis_pitch is not None: self.manual_angles["pelvis"]["pitch"] = cmd.pelvis_pitch
            if cmd.pelvis_yaw is not None: self.manual_angles["pelvis"]["yaw"] = cmd.pelvis_yaw

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            connection_manager.add_log("INFO", f"Synthetic IMU simulation started at {self.hz} Hz (pattern: {self.pattern}).")

    def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            self._task = None
        connection_manager.add_log("INFO", "Synthetic IMU simulation stopped.")

    async def _run_loop(self):
        start_time = time.time()
        prev_angles = {"chest": (0.0, 0.0, 0.0), "torso": (0.0, 0.0, 0.0), "pelvis": (0.0, 0.0, 0.0)}
        prev_t = time.time()

        while self.is_running:
            try:
                loop_start = time.time()
                t = loop_start - start_time
                dt = max(1e-4, loop_start - prev_t)
                prev_t = loop_start
                self.sequence += 1

                # Calculate angles based on pattern
                angles = self._compute_angles(t)

                sensors_dict = {}
                for s_name in ["chest", "torso", "pelvis"]:
                    roll, pitch, yaw = angles[s_name]
                    # Add tiny realistic sensor noise
                    noise_r = (random.random() - 0.5) * 0.2
                    noise_p = (random.random() - 0.5) * 0.2
                    noise_y = (random.random() - 0.5) * 0.2
                    roll += noise_r
                    pitch += noise_p
                    yaw += noise_y

                    # Angular velocity (deg/s -> converted to rad/s)
                    p_roll, p_pitch, p_yaw = prev_angles[s_name]
                    gyro_x = math.radians((roll - p_roll) / dt)
                    gyro_y = math.radians((pitch - p_pitch) / dt)
                    gyro_z = math.radians((yaw - p_yaw) / dt)
                    prev_angles[s_name] = (roll, pitch, yaw)

                    # Compute quaternion
                    qw, qx, qy, qz = euler_deg_to_quaternion(roll, pitch, yaw)

                    # Gravity vector projection in sensor body frame
                    # R^T * [0, 0, 9.81]
                    # R_sensor transforms body to world. Gravity is [0, 0, 9.81] in world.
                    # Acceleration measured is reaction to gravity = +g upwards:
                    r_rad = math.radians(roll)
                    p_rad = math.radians(pitch)
                    acc_x = -9.81 * math.sin(p_rad)
                    acc_y = 9.81 * math.sin(r_rad) * math.cos(p_rad)
                    acc_z = 9.81 * math.cos(r_rad) * math.cos(p_rad)

                    sensors_dict[s_name] = SensorPayload(
                        connected=True,
                        accel=Vector3D(x=round(acc_x, 3), y=round(acc_y, 3), z=round(acc_z, 3)),
                        gyro=Vector3D(x=round(gyro_x, 4), y=round(gyro_y, 4), z=round(gyro_z, 4)),
                        euler_deg=EulerDeg(roll=round(roll, 2), pitch=round(pitch, 2), yaw=round(yaw, 2)),
                        quaternion=Quaternion(w=round(qw, 4), x=round(qx, 4), y=round(qy, 4), z=round(qz, 4)),
                        calibration_status=3,
                        data_valid=True
                    )

                packet = DeviceTelemetryPacket(
                    version="1.0.0",
                    device_id=self.device_id,
                    timestamp_ms=int(time.time() * 1000),
                    sequence=self.sequence,
                    mode="simulation",
                    sensors=sensors_dict
                )

                await connection_manager.broadcast_telemetry(packet)

                # Maintain steady frequency
                calc_time = time.time() - loop_start
                sleep_time = max(0.001, (1.0 / self.hz) - calc_time)
                await asyncio.sleep(sleep_time)

            except asyncio.CancelledError:
                break
            except Exception as e:
                connection_manager.add_log("ERROR", f"Simulation loop error: {e}")
                await asyncio.sleep(0.1)

    def _compute_angles(self, t: float) -> Dict[str, tuple]:
        if self.pattern == "manual":
            return {
                "chest": (
                    self.manual_angles["chest"]["roll"],
                    self.manual_angles["chest"]["pitch"],
                    self.manual_angles["chest"]["yaw"],
                ),
                "torso": (
                    self.manual_angles["torso"]["roll"],
                    self.manual_angles["torso"]["pitch"],
                    self.manual_angles["torso"]["yaw"],
                ),
                "pelvis": (
                    self.manual_angles["pelvis"]["roll"],
                    self.manual_angles["pelvis"]["pitch"],
                    self.manual_angles["pelvis"]["yaw"],
                ),
            }

        elif self.pattern == "forward_lean":
            # Smooth oscillatory forward flex: 0 to +35 deg
            wave = (math.sin(t * 1.5) + 1.0) * 0.5  # 0 to 1
            pelvis_p = wave * 10.0
            torso_p = wave * 22.0
            chest_p = wave * 35.0
            return {
                "chest": (0.0, chest_p, 0.0),
                "torso": (0.0, torso_p, 0.0),
                "pelvis": (0.0, pelvis_p, 0.0),
            }

        elif self.pattern == "backward_lean":
            wave = (math.sin(t * 1.5) + 1.0) * 0.5
            pelvis_p = -wave * 6.0
            torso_p = -wave * 15.0
            chest_p = -wave * 22.0
            return {
                "chest": (0.0, pelvis_p + torso_p, 0.0),
                "torso": (0.0, torso_p, 0.0),
                "pelvis": (0.0, pelvis_p, 0.0),
            }

        elif self.pattern == "left_tilt":
            wave = (math.sin(t * 1.6) + 1.0) * 0.5
            return {
                "chest": (-wave * 25.0, 0.0, 0.0),
                "torso": (-wave * 16.0, 0.0, 0.0),
                "pelvis": (-wave * 7.0, 0.0, 0.0),
            }

        elif self.pattern == "right_tilt":
            wave = (math.sin(t * 1.6) + 1.0) * 0.5
            return {
                "chest": (wave * 25.0, 0.0, 0.0),
                "torso": (wave * 16.0, 0.0, 0.0),
                "pelvis": (wave * 7.0, 0.0, 0.0),
            }

        elif self.pattern == "torso_twist":
            wave = math.sin(t * 1.4)  # -1 to 1
            return {
                "chest": (0.0, 0.0, wave * 32.0),
                "torso": (0.0, 0.0, wave * 18.0),
                "pelvis": (0.0, 0.0, wave * 6.0),
            }

        elif self.pattern == "walking_sway":
            # Combined roll and yaw sway characteristic of human gait
            roll_wave = math.sin(t * 2.2)
            yaw_wave = math.cos(t * 1.1)
            pitch_wave = math.sin(t * 4.4) * 0.5
            return {
                "chest": (roll_wave * 6.0, pitch_wave * 2.0, yaw_wave * 10.0),
                "torso": (roll_wave * 4.0, pitch_wave * 1.5, yaw_wave * 6.0),
                "pelvis": (roll_wave * 2.5, pitch_wave * 1.0, yaw_wave * 3.0),
            }

        else:  # standing / default subtle micro-sway
            sway_r = math.sin(t * 0.8) * 1.2
            sway_p = math.cos(t * 0.6) * 1.5
            return {
                "chest": (sway_r * 1.4, sway_p * 1.5, 0.0),
                "torso": (sway_r * 1.0, sway_p * 1.0, 0.0),
                "pelvis": (sway_r * 0.6, sway_p * 0.6, 0.0),
            }

simulation_engine = SimulationEngine()
