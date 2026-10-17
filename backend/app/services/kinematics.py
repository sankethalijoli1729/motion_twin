import math
from typing import Tuple, Dict

def normalize_quaternion(w: float, x: float, y: float, z: float) -> Tuple[float, float, float, float]:
    """Return normalized quaternion (w, x, y, z). Prevents drift and numerical explosion."""
    mag_sq = w*w + x*x + y*y + z*z
    if mag_sq < 1e-12:
        return 1.0, 0.0, 0.0, 0.0
    inv_mag = 1.0 / math.sqrt(mag_sq)
    return w * inv_mag, x * inv_mag, y * inv_mag, z * inv_mag

def quaternion_multiply(q1: Tuple[float, float, float, float], q2: Tuple[float, float, float, float]) -> Tuple[float, float, float, float]:
    """Hamilton product of two quaternions q1 * q2."""
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2
    w = w1*w2 - x1*x2 - y1*y2 - z1*z2
    x = w1*x2 + x1*w2 + y1*z2 - z1*y2
    y = w1*y2 - x1*z2 + y1*w2 + z1*x2
    z = w1*z2 + x1*y2 - y1*x2 + z1*w2
    return normalize_quaternion(w, x, y, z)

def quaternion_conjugate(q: Tuple[float, float, float, float]) -> Tuple[float, float, float, float]:
    """Quaternion conjugate (inverse if unit quaternion)."""
    w, x, y, z = q
    return w, -x, -y, -z

def quaternion_to_euler_deg(w: float, x: float, y: float, z: float) -> Tuple[float, float, float]:
    """
    Convert unit quaternion to roll, pitch, yaw (in degrees).
    Standard aerospace sequence (Yaw -> Pitch -> Roll):
    Roll = atan2(2*(w*x + y*z), 1 - 2*(x*x + y*y))
    Pitch = asin(2*(w*y - z*x)) (clamped)
    Yaw = atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z))
    """
    # roll (x-axis rotation)
    sinr_cosp = 2.0 * (w * x + y * z)
    cosr_cosp = 1.0 - 2.0 * (x * x + y * y)
    roll = math.atan2(sinr_cosp, cosr_cosp)

    # pitch (y-axis rotation)
    sinp = 2.0 * (w * y - z * x)
    if abs(sinp) >= 1:
        pitch = math.copysign(math.pi / 2.0, sinp)  # gimbal lock limit
    else:
        pitch = math.asin(sinp)

    # yaw (z-axis rotation)
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    yaw = math.atan2(siny_cosp, cosy_cosp)

    return (
        round(math.degrees(roll), 2),
        round(math.degrees(pitch), 2),
        round(math.degrees(yaw), 2),
    )

def euler_deg_to_quaternion(roll_deg: float, pitch_deg: float, yaw_deg: float) -> Tuple[float, float, float, float]:
    """Convert Euler angles (in degrees) to unit quaternion (w, x, y, z)."""
    roll = math.radians(roll_deg)
    pitch = math.radians(pitch_deg)
    yaw = math.radians(yaw_deg)

    cr = math.cos(roll * 0.5)
    sr = math.sin(roll * 0.5)
    cp = math.cos(pitch * 0.5)
    sp = math.sin(pitch * 0.5)
    cy = math.cos(yaw * 0.5)
    sy = math.sin(yaw * 0.5)

    w = cr * cp * cy + sr * sp * sy
    x = sr * cp * cy - cr * sp * sy
    y = cr * sp * cy + sr * cp * sy
    z = cr * cp * sy - sr * sp * cy

    return normalize_quaternion(w, x, y, z)

def slerp(q1: Tuple[float, float, float, float], q2: Tuple[float, float, float, float], t: float) -> Tuple[float, float, float, float]:
    """Spherical linear interpolation between two quaternions."""
    w1, x1, y1, z1 = q1
    w2, x2, y2, z2 = q2

    dot = w1*w2 + x1*x2 + y1*y2 + z1*z2

    # If the dot product is negative, slerp won't take the shorter path.
    # Note that v1 and -v1 are equivalent when the negation is applied to all four components.
    if dot < 0.0:
        w2, x2, y2, z2 = -w2, -x2, -y2, -z2
        dot = -dot

    dot = min(1.0, max(-1.0, dot))

    if dot > 0.9995:
        # Linear interpolation if almost identical to prevent division by zero
        result = (
            w1 + t * (w2 - w1),
            x1 + t * (x2 - x1),
            y1 + t * (y2 - x1),
            z1 + t * (z2 - z1),
        )
        return normalize_quaternion(*result)

    theta_0 = math.acos(dot)
    theta = theta_0 * t

    sin_theta = math.sin(theta)
    sin_theta_0 = math.sin(theta_0)

    s0 = math.cos(theta) - dot * sin_theta / sin_theta_0
    s1 = sin_theta / sin_theta_0

    return (
        s0 * w1 + s1 * w2,
        s0 * x1 + s1 * x2,
        s0 * y1 + s1 * y2,
        s0 * z1 + s1 * z2,
    )
