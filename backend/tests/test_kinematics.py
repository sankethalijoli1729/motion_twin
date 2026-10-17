import pytest
import math
from app.services.kinematics import (
    normalize_quaternion,
    quaternion_multiply,
    quaternion_conjugate,
    euler_deg_to_quaternion,
    quaternion_to_euler_deg,
    slerp
)

def test_quaternion_normalization():
    w, x, y, z = normalize_quaternion(2.0, 0.0, 0.0, 0.0)
    assert pytest.approx(w) == 1.0
    assert pytest.approx(x) == 0.0

def test_euler_to_quaternion_and_back():
    roll_in, pitch_in, yaw_in = 15.0, -25.0, 40.0
    qw, qx, qy, qz = euler_deg_to_quaternion(roll_in, pitch_in, yaw_in)
    
    # Unit quaternion magnitude
    mag = math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz)
    assert pytest.approx(mag, abs=1e-5) == 1.0

    r_out, p_out, y_out = quaternion_to_euler_deg(qw, qx, qy, qz)
    assert pytest.approx(r_out, abs=0.5) == roll_in
    assert pytest.approx(p_out, abs=0.5) == pitch_in
    assert pytest.approx(y_out, abs=0.5) == yaw_in

def test_quaternion_multiplication():
    # Identity multiplication
    q_id = (1.0, 0.0, 0.0, 0.0)
    q_rot = euler_deg_to_quaternion(30.0, 0.0, 0.0)
    q_res = quaternion_multiply(q_id, q_rot)
    assert pytest.approx(q_res[0], abs=1e-4) == q_rot[0]
    assert pytest.approx(q_res[1], abs=1e-4) == q_rot[1]

def test_slerp_interpolation():
    q0 = (1.0, 0.0, 0.0, 0.0)
    q1 = euler_deg_to_quaternion(0.0, 90.0, 0.0)
    
    # Midpoint t = 0.5 should be approx 45 degrees
    q_mid = slerp(q0, q1, 0.5)
    _, pitch, _ = quaternion_to_euler_deg(*q_mid)
    assert pytest.approx(pitch, abs=1.0) == 45.0
