export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerDeg {
  roll: number;
  pitch: number;
  yaw: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface SensorData {
  connected: boolean;
  accel: Vector3D;
  gyro: Vector3D;
  euler_deg: EulerDeg;
  quaternion: Quaternion;
  calibration_status: number; // 0-3
  data_valid: boolean;
}

export interface TelemetryPacket {
  version: string;
  device_id: string;
  timestamp_ms: number;
  sequence: number;
  mode: "simulation" | "hardware";
  sensors: {
    chest: SensorData;
    torso: SensorData;
    pelvis: SensorData;
    [key: string]: SensorData;
  };
  server_received_ms?: number;
}

export interface RecordingStatus {
  active_session_id: number | null;
  is_recording: boolean;
  is_paused: boolean;
  sample_sequence: number;
  buffered_samples: number;
  total_recorded_samples: number;
}

export interface DiagnosticsData {
  device_id: string;
  device_mode: "simulation" | "hardware";
  device_status: "online" | "simulation" | "offline" | "standby";
  connected_frontends: number;
  connected_hardware: number;
  packet_rate_hz: number;
  total_packets_received: number;
  missing_sequences: number;
  invalid_packet_count: number;
  reconnect_count: number;
  last_packet_age_ms: number | null;
  recording_status: RecordingStatus;
  logs: Array<{
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
    message: string;
  }>;
}

export interface SessionItem {
  id: number;
  device_id: string;
  session_name: string;
  activity_label: string;
  data_source: "simulation" | "hardware";
  started_at: string;
  ended_at: string | null;
  sample_count: number;
  notes: string | null;
  created_at: string;
}

export interface SessionDetail extends SessionItem {
  duration_seconds: number;
  mean_angular_velocity: number;
  max_angular_velocity: number;
  gap_count: number;
}

export interface SampleItem {
  id: number;
  session_id: number;
  device_timestamp_ms: number;
  sample_sequence: number;
  sensor_name: "chest" | "torso" | "pelvis";
  acceleration_x: number;
  acceleration_y: number;
  acceleration_z: number;
  gyroscope_x: number;
  gyroscope_y: number;
  gyroscope_z: number;
  quaternion_w: number;
  quaternion_x: number;
  quaternion_y: number;
  quaternion_z: number;
  roll_deg: number;
  pitch_deg: number;
  yaw_deg: number;
  data_valid: boolean;
}
