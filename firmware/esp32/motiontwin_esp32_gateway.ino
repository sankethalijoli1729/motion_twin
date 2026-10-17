/**
 * MOTIONTWIN — ESP32 MULTI-IMU KINEMATIC GATEWAY FIRMWARE
 * -------------------------------------------------------------
 * Hardware:
 *   - ESP32-WROOM-32 / ESP32-S3
 *   - TCA9548A 8-Channel I²C Multiplexer
 *   - 3x MPU-6050 6-DOF IMU Sensors:
 *       * Channel 0: Upper Chest (Thoracic Spine)
 *       * Channel 1: Lower Torso (Lumbar Spine)
 *       * Channel 2: Pelvis / Waist (Root Base)
 *
 * Protocol:
 *   - WebSockets (RFC 6455) JSON streaming to backend /ws/device
 *   - Sensor Fusion: Complementary Filter (Alpha = 0.98)
 *
 * Requirements:
 *   - Arduino_JSON / ArduinoJson library
 *   - WebSocketsClient (by Markus Sattler)
 *   - Adafruit_MPU6050 & Adafruit_Sensor libraries
 */

#include <WiFi.h>
#include <Wire.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ================= USER CONFIGURATION =================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* BACKEND_HOST  = "192.168.1.100"; // IP address of backend server
const int   BACKEND_PORT  = 8000;
const char* WS_DEVICE_URI = "/ws/device?device_id=motiontwin-esp32-01";

// ESP32 I2C Pins
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define TCA9548A_ADDR 0x70
#define MPU6050_ADDR  0x68

#define SAMPLING_RATE_HZ 30
const unsigned long SAMPLE_INTERVAL_MS = 1000 / SAMPLING_RATE_HZ;

// ================= DATA STRUCTURES =================
struct SegmentOrientation {
  float roll;   // degrees
  float pitch;  // degrees
  float yaw;    // degrees (integrated relative heading)
  float qw, qx, qy, qz;
  float ax, ay, az; // m/s^2
  float gx, gy, gz; // rad/s
  bool connected;
};

SegmentOrientation chest;
SegmentOrientation torso;
SegmentOrientation pelvis;

WebSocketsClient webSocket;
unsigned long lastSampleTime = 0;
unsigned long packetSequence = 0;

// ================= I2C MULTIPLEXER SELECTOR =================
void tcaSelect(uint8_t channel) {
  if (channel > 7) return;
  Wire.beginTransmission(TCA9548A_ADDR);
  Wire.write(1 << channel);
  Wire.endTransmission();
}

// ================= SENSOR FUSION & QUATERNIONS =================
void eulerToQuaternion(float rollDeg, float pitchDeg, float yawDeg, float &qw, float &qx, float &qy, float &qz) {
  float roll = radians(rollDeg);
  float pitch = radians(pitchDeg);
  float yaw = radians(yawDeg);

  float cr = cos(roll * 0.5);
  float sr = sin(roll * 0.5);
  float cp = cos(pitch * 0.5);
  float sp = sin(pitch * 0.5);
  float cy = cos(yaw * 0.5);
  float sy = sin(yaw * 0.5);

  qw = cr * cp * cy + sr * sp * sy;
  qx = sr * cp * cy - cr * sp * sy;
  qy = cr * sp * cy + sr * cp * sy;
  qz = cr * cp * sy - sr * sp * cy;

  float norm = sqrt(qw*qw + qx*qx + qy*qy + qz*qz);
  if (norm > 0.0001) {
    qw /= norm; qx /= norm; qy /= norm; qz /= norm;
  }
}

void initMPU6050(uint8_t channel) {
  tcaSelect(channel);
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake up MPU-6050
  Wire.endTransmission(true);
}

void readMPU6050(uint8_t channel, SegmentOrientation &seg, float dt) {
  tcaSelect(channel);
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B); // Starting register for Accel X
  uint8_t err = Wire.endTransmission(false);
  if (err != 0) {
    seg.connected = false;
    return;
  }
  seg.connected = true;

  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);
  if (Wire.available() >= 14) {
    int16_t rawAx = (Wire.read() << 8) | Wire.read();
    int16_t rawAy = (Wire.read() << 8) | Wire.read();
    int16_t rawAz = (Wire.read() << 8) | Wire.read();
    int16_t rawTemp = (Wire.read() << 8) | Wire.read();
    int16_t rawGx = (Wire.read() << 8) | Wire.read();
    int16_t rawGy = (Wire.read() << 8) | Wire.read();
    int16_t rawGz = (Wire.read() << 8) | Wire.read();

    // Scale factors: ±2g -> 16384 LSB/g, ±250 deg/s -> 131 LSB/(deg/s)
    seg.ax = (rawAx / 16384.0) * 9.80665;
    seg.ay = (rawAy / 16384.0) * 9.80665;
    seg.az = (rawAz / 16384.0) * 9.80665;

    float gyroXDeg = rawGx / 131.0;
    float gyroYDeg = rawGy / 131.0;
    float gyroZDeg = rawGz / 131.0;

    seg.gx = radians(gyroXDeg);
    seg.gy = radians(gyroYDeg);
    seg.gz = radians(gyroZDeg);

    // Accelerometer tilt estimation
    float rollAcc = atan2(seg.ay, seg.az) * 180.0 / PI;
    float pitchAcc = atan2(-seg.ax, sqrt(seg.ay * seg.ay + seg.az * seg.az)) * 180.0 / PI;

    // Complementary filter: 98% gyro integration, 2% accelerometer correction
    seg.roll = 0.98 * (seg.roll + gyroXDeg * dt) + 0.02 * rollAcc;
    seg.pitch = 0.98 * (seg.pitch + gyroYDeg * dt) + 0.02 * pitchAcc;
    seg.yaw += gyroZDeg * dt; // Note: Yaw drifts without magnetometer

    eulerToQuaternion(seg.roll, seg.pitch, seg.yaw, seg.qw, seg.qx, seg.qy, seg.qz);
  }
}

// ================= WEBSOCKET HANDLER =================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from MotionTwin Gateway");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to MotionTwin Backend Gateway!");
      break;
    case WStype_TEXT:
      // Heartbeat or incoming config
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000); // 400kHz Fast I2C

  Serial.println("\n[MotionTwin] Initializing ESP32 Gateway Rig...");

  // Initialize sensors on TCA channels 0, 1, 2
  initMPU6050(0); // Chest
  initMPU6050(1); // Torso
  initMPU6050(2); // Pelvis

  // Connect Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting to network");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

  // Connect WebSocket
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, WS_DEVICE_URI);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(2000);
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    float dt = (now - lastSampleTime) / 1000.0;
    lastSampleTime = now;
    packetSequence++;

    // Acquire all 3 IMUs
    readMPU6050(0, chest, dt);
    readMPU6050(1, torso, dt);
    readMPU6050(2, pelvis, dt);

    // Build JSON Payload
    StaticJsonDocument<1536> doc;
    doc["version"] = "1.0.0";
    doc["device_id"] = "motiontwin-esp32-01";
    doc["timestamp_ms"] = now;
    doc["sequence"] = packetSequence;
    doc["mode"] = "hardware";

    JsonObject sensors = doc.createNestedObject("sensors");

    auto addSensorJson = [&](const char* name, const SegmentOrientation &seg) {
      JsonObject obj = sensors.createNestedObject(name);
      obj["connected"] = seg.connected;
      JsonObject a = obj.createNestedObject("accel");
      a["x"] = round(seg.ax * 100) / 100.0;
      a["y"] = round(seg.ay * 100) / 100.0;
      a["z"] = round(seg.az * 100) / 100.0;
      JsonObject g = obj.createNestedObject("gyro");
      g["x"] = round(seg.gx * 1000) / 1000.0;
      g["y"] = round(seg.gy * 1000) / 1000.0;
      g["z"] = round(seg.gz * 1000) / 1000.0;
      JsonObject e = obj.createNestedObject("euler_deg");
      e["roll"] = round(seg.roll * 10) / 10.0;
      e["pitch"] = round(seg.pitch * 10) / 10.0;
      e["yaw"] = round(seg.yaw * 10) / 10.0;
      JsonObject q = obj.createNestedObject("quaternion");
      q["w"] = round(seg.qw * 1000) / 1000.0;
      q["x"] = round(seg.qx * 1000) / 1000.0;
      q["y"] = round(seg.qy * 1000) / 1000.0;
      q["z"] = round(seg.qz * 1000) / 1000.0;
      obj["data_valid"] = seg.connected;
    };

    addSensorJson("chest", chest);
    addSensorJson("torso", torso);
    addSensorJson("pelvis", pelvis);

    String output;
    serializeJson(doc, output);
    webSocket.sendTXT(output);
  }
}
