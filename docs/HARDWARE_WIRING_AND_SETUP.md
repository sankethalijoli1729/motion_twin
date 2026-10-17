# MotionTwin — Hardware Wiring, Sensor Fusion & ESP32 Integration Guide

## 1. System Architecture Overview

The physical MotionTwin sensory system tracks the human core kinematic chain using three 6-DOF Inertial Measurement Units (IMUs) affixed along the spinal axis:

1. **IMU 1 (Thoracic Spine / Upper Chest)**: TCA9548A Channel 0
2. **IMU 2 (Lumbar Spine / Lower Torso)**: TCA9548A Channel 1
3. **IMU 3 (Pelvic Girdle / Waist Root)**: TCA9548A Channel 2

Data flows from the 3 MPU-6050 sensors over a shared I²C bus mediated by a **TCA9548A multiplexer**, into an **ESP32 microcontroller**, which performs on-board complementary/Madgwick orientation estimation and streams serialized JSON packets to the FastAPI backend over Wi-Fi WebSockets.

---

## 2. I²C Address Conflict & Multiplexing

### The MPU-6050 Address Limitation
Each MPU-6050 sensor provides only one address pin (`AD0`):
* `AD0 = GND` → I²C Address: `0x68`
* `AD0 = VCC` → I²C Address: `0x69`

Because only two hardware addresses exist for MPU-6050, connecting three identical modules to a single I²C bus without arbitration creates bus collisions.

### Solution: TCA9548A 8-Channel I²C Multiplexer
The **TCA9548A** sits at I²C address `0x70` on the ESP32 bus. Before communicating with any IMU, the ESP32 writes a channel mask register to `0x70`, which connects the main I²C bus to one of the multiplexer's sub-buses (SC0/SD0 through SC7/SD7).

```
ESP32 (SDA: GPIO 21, SCL: GPIO 22)
                 │
           TCA9548A (0x70)
         ┌───────┼───────┐
      Ch 0     Ch 1    Ch 2
        │        │       │
    MPU-6050 MPU-6050 MPU-6050
    (Chest)  (Torso)  (Pelvis)
```

---

## 3. Hardware Pinout & Wiring Table

| Component | Pin | ESP32 Connection | Notes |
| :--- | :--- | :--- | :--- |
| **TCA9548A** | VCC | 3.3V or 5V | Power supply |
| | GND | GND | Common ground |
| | SDA | GPIO 21 | ESP32 Hardware I2C SDA |
| | SCL | GPIO 22 | ESP32 Hardware I2C SCL |
| | A0, A1, A2 | GND | Selects base address `0x70` |
| | RST | 3.3V | Pull high for normal operation |
| **IMU 1 (Chest)** | VCC, GND | 3.3V / GND | Power |
| | SDA, SCL | TCA SD0, SC0 | Multiplexer Channel 0 |
| | AD0 | GND | Address `0x68` |
| **IMU 2 (Torso)** | VCC, GND | 3.3V / GND | Power |
| | SDA, SCL | TCA SD1, SC1 | Multiplexer Channel 1 |
| | AD0 | GND | Address `0x68` |
| **IMU 3 (Pelvis)** | VCC, GND | 3.3V / GND | Power |
| | SDA, SCL | TCA SD2, SC2 | Multiplexer Channel 2 |
| | AD0 | GND | Address `0x68` |

---

## 4. Coordinate Frame Conventions

MotionTwin uses the standard aerospace and robotics coordinate conventions:
* **+X Axis**: Points forward (direction of anterior chest / gaze)
* **+Y Axis**: Points laterally left
* **+Z Axis**: Points upwards (cranial direction)

### Three.js Viewport Conversion:
In Three.js (+Y up, +X right, +Z towards camera):
* Roll (lateral tilt) rotates about the frontal axis
* Pitch (flexion/extension) rotates about the sagittal lateral axis
* Yaw (axial twist) rotates about the vertical cranial axis

---

## 5. Sensor Calibration & Bias Estimation

1. **Stationary Bias Capture**:
   During power-up, keep the subject or rig stationary for 3 seconds. The firmware samples the gyroscope registers $N=200$ times and calculates stationary offsets:
   $$\text{Bias}_x = \frac{1}{N}\sum g_x, \quad \text{Bias}_y = \frac{1}{N}\sum g_y, \quad \text{Bias}_z = \frac{1}{N}\sum g_z$$
2. **Accelerometer Gravitational Vector**:
   With the sensor vertical, the accelerometer measures standard gravity $1.0\text{g} \approx 9.80665\,\text{m/s}^2$ along the vertical axis.
3. **Tare / Zero Pose Calibration**:
   The web application UI features a **"Calibrate Zero Pose"** button. This stores relative offset angles $(\Delta\text{roll}, \Delta\text{pitch}, \Delta\text{yaw})$ so any natural wearable strap tilt is tared to neutral upright posture ($0^\circ$).

---

## 6. Sensor Fusion & Orientation Estimation

The system uses a **Complementary Filter** (or Madgwick AHRS filter):
$$\text{Angle}_{t} = \alpha \cdot (\text{Angle}_{t-1} + \omega \cdot \Delta t) + (1 - \alpha) \cdot \text{Angle}_{\text{acc}}$$
* $\alpha = 0.98$: Filters out high-frequency mechanical vibration from accelerometer while correcting slow integration drift from gyroscope.

### Yaw Estimation Limitations Without a Magnetometer
* Accelerometers can only measure gravity, which resolves **Pitch** and **Roll** relative to the Earth's horizontal plane.
* **Yaw** (rotation around the vertical gravity vector) has no gravitational reference. Without a 3-axis magnetometer (e.g. MPU9250 or BMM150) to measure the Earth's magnetic heading, yaw relies exclusively on gyro rate integration $\int \omega_z \, dt$.
* Over long durations (e.g., >10 minutes), raw yaw will slowly drift. The MotionTwin firmware mitigates this via relative inter-segment comparison (differential twist between chest and pelvis) and provides quick software zeroing.

---

## 7. Orientation Tracking vs. Absolute Position Tracking

> **IMPORTANT ENGINEERING DISTINCTION:**
> Three IMUs provide **3-DOF orientation estimates** (Roll, Pitch, Yaw) for body segments, and by using rigid-body kinematic forward kinematics, articulate a human digital twin.
> **They DO NOT provide absolute 3D Cartesian coordinates ($X, Y, Z$) in room space.**
> Double integrating accelerometer data $\iint a(t) \, dt^2$ to derive position leads to quadratic positional drift within seconds ($\approx \text{meters}$ of drift). Absolute room tracking requires external optical cameras, UWB beacons, or IMU foot-zero-velocity updates (ZUPT).

---

## 8. Multi-Microcontroller Architecture Alternative

If using multiple ESP32s or ESP32-C3 modules (one per sensor node) instead of a centralized multiplexer:
* **Transport**: Each ESP32 can connect directly to the local Wi-Fi router or form an ESP-NOW star network with a central coordinator gateway.
* **Synchronization**: Timestamp alignment requires NTP synchronization or synchronized sequential sample packets.
* **Benefit**: Eliminates long wearable I²C ribbon cables across the spine.
