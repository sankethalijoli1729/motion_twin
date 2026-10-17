import { describe, it, expect, beforeEach } from "vitest";
import { useTwinStore } from "../store/useTwinStore";

describe("MotionTwin Zustand Store", () => {
  beforeEach(() => {
    useTwinStore.setState({
      wsConnected: false,
      packetRateHz: 0,
      isRecording: false,
      isPaused: false,
      activeSessionId: null,
      history: [],
      simPattern: "standing",
    });
  });

  it("should update WebSocket connection state", () => {
    expect(useTwinStore.getState().wsConnected).toBe(false);
    useTwinStore.getState().setWsConnected(true);
    expect(useTwinStore.getState().wsConnected).toBe(true);
  });

  it("should handle recording lifecycle state changes", () => {
    expect(useTwinStore.getState().isRecording).toBe(false);
    
    // Start recording
    useTwinStore.getState().setRecordingState(true, false, 42, "Test Session");
    expect(useTwinStore.getState().isRecording).toBe(true);
    expect(useTwinStore.getState().isPaused).toBe(false);
    expect(useTwinStore.getState().activeSessionId).toBe(42);

    // Pause recording
    useTwinStore.getState().setRecordingState(true, true, 42);
    expect(useTwinStore.getState().isPaused).toBe(true);

    // Stop recording
    useTwinStore.getState().setRecordingState(false, false, null);
    expect(useTwinStore.getState().isRecording).toBe(false);
    expect(useTwinStore.getState().activeSessionId).toBe(null);
  });

  it("should update simulation pattern and manual sliders", () => {
    useTwinStore.getState().setSimPattern("forward_lean");
    expect(useTwinStore.getState().simPattern).toBe("forward_lean");

    useTwinStore.getState().setManualAngle("chest", "pitch", 28.5);
    expect(useTwinStore.getState().manualAngles.chest.pitch).toBe(28.5);
  });

  it("should calibrate and zero orientation offsets", () => {
    useTwinStore.setState({
      latestPacket: {
        version: "1.0.0",
        device_id: "test-dev",
        timestamp_ms: 12345,
        sequence: 1,
        mode: "simulation",
        sensors: {
          chest: {
            connected: true,
            accel: { x: 0, y: 0, z: 9.81 },
            gyro: { x: 0, y: 0, z: 0 },
            euler_deg: { roll: 5.0, pitch: 12.0, yaw: -3.0 },
            quaternion: { w: 1, x: 0, y: 0, z: 0 },
            calibration_status: 3,
            data_valid: true,
          },
          torso: {
            connected: true,
            accel: { x: 0, y: 0, z: 9.81 },
            gyro: { x: 0, y: 0, z: 0 },
            euler_deg: { roll: 2.0, pitch: 6.0, yaw: -1.0 },
            quaternion: { w: 1, x: 0, y: 0, z: 0 },
            calibration_status: 3,
            data_valid: true,
          },
          pelvis: {
            connected: true,
            accel: { x: 0, y: 0, z: 9.81 },
            gyro: { x: 0, y: 0, z: 0 },
            euler_deg: { roll: 0.5, pitch: 1.0, yaw: 0.0 },
            quaternion: { w: 1, x: 0, y: 0, z: 0 },
            calibration_status: 3,
            data_valid: true,
          },
        },
      },
    });

    useTwinStore.getState().calibrateOrientation();
    expect(useTwinStore.getState().calibrationOffsets.chest.pitch).toBe(12.0);

    useTwinStore.getState().resetCalibration();
    expect(useTwinStore.getState().calibrationOffsets.chest.pitch).toBe(0.0);
  });
});
