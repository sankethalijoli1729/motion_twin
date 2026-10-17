import { create } from "zustand";
import { TelemetryPacket, EulerDeg } from "../types/telemetry";

export interface TimePointTelemetry {
  timeStr: string;
  chestRoll: number;
  chestPitch: number;
  chestYaw: number;
  torsoRoll: number;
  torsoPitch: number;
  torsoYaw: number;
  pelvisRoll: number;
  pelvisPitch: number;
  pelvisYaw: number;
  accelChestMag: number;
  gyroChestMag: number;
}

interface TwinState {
  // Telemetry
  latestPacket: TelemetryPacket | null;
  wsConnected: boolean;
  packetRateHz: number;
  missingSequences: number;
  history: TimePointTelemetry[];

  // Recording
  isRecording: boolean;
  isPaused: boolean;
  activeSessionId: number | null;
  activeSessionName: string;

  // 3D Viewport Controls
  showSkeleton: boolean;
  showSensors: boolean;
  showAxes: boolean;
  cameraPreset: "front" | "rear" | "side" | "top" | "free";
  smoothingFactor: number;
  useRawOrientation: boolean;
  calibrationOffsets: {
    chest: EulerDeg;
    torso: EulerDeg;
    pelvis: EulerDeg;
  };

  // Simulation Controls
  simPattern: string;
  simHz: number;
  manualAngles: {
    chest: EulerDeg;
    torso: EulerDeg;
    pelvis: EulerDeg;
  };

  // Configuration
  backendUrl: string;
  wsUrl: string;
  invertPitch: boolean;
  invertRoll: boolean;
  invertYaw: boolean;

  // Actions
  setWsConnected: (connected: boolean) => void;
  updateTelemetry: (packet: TelemetryPacket, rateHz?: number, missing?: number) => void;
  setRecordingState: (recording: boolean, paused: boolean, sessionId: number | null, name?: string) => void;
  setShowSkeleton: (show: boolean) => void;
  setShowSensors: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setCameraPreset: (preset: "front" | "rear" | "side" | "top" | "free") => void;
  setSmoothingFactor: (factor: number) => void;
  setUseRawOrientation: (raw: boolean) => void;
  calibrateOrientation: () => void;
  resetCalibration: () => void;
  setSimPattern: (pattern: string) => void;
  setSimHz: (hz: number) => void;
  setManualAngle: (sensor: "chest" | "torso" | "pelvis", axis: "roll" | "pitch" | "yaw", value: number) => void;
  setSettings: (settings: Partial<{ backendUrl: string; wsUrl: string; invertPitch: boolean; invertRoll: boolean; invertYaw: boolean }>) => void;
}

export const useTwinStore = create<TwinState>((set, get) => ({
  latestPacket: null,
  wsConnected: false,
  packetRateHz: 0,
  missingSequences: 0,
  history: [],

  isRecording: false,
  isPaused: false,
  activeSessionId: null,
  activeSessionName: "",

  showSkeleton: true,
  showSensors: true,
  showAxes: false,
  cameraPreset: "front",
  smoothingFactor: 0.15,
  useRawOrientation: false,
  calibrationOffsets: {
    chest: { roll: 0, pitch: 0, yaw: 0 },
    torso: { roll: 0, pitch: 0, yaw: 0 },
    pelvis: { roll: 0, pitch: 0, yaw: 0 },
  },

  simPattern: "standing",
  simHz: 30,
  manualAngles: {
    chest: { roll: 0, pitch: 0, yaw: 0 },
    torso: { roll: 0, pitch: 0, yaw: 0 },
    pelvis: { roll: 0, pitch: 0, yaw: 0 },
  },

  backendUrl: "http://127.0.0.1:8000",
  wsUrl: "ws://127.0.0.1:8000/ws/live",
  invertPitch: false,
  invertRoll: false,
  invertYaw: false,

  setWsConnected: (connected) => set({ wsConnected: connected }),

  updateTelemetry: (packet, rateHz, missing) => {
    const s = get();
    const now = new Date();
    const timeStr = `${now.getMinutes()}:${now.getSeconds()}.${Math.floor(now.getMilliseconds() / 100)}`;
    
    const chest = packet.sensors.chest;
    const torso = packet.sensors.torso;
    const pelvis = packet.sensors.pelvis;

    const ax = chest?.accel?.x || 0;
    const ay = chest?.accel?.y || 0;
    const az = chest?.accel?.z || 0;
    const accelMag = Math.round(Math.sqrt(ax * ax + ay * ay + az * az) * 100) / 100;

    const gx = chest?.gyro?.x || 0;
    const gy = chest?.gyro?.y || 0;
    const gz = chest?.gyro?.z || 0;
    const gyroMag = Math.round(Math.sqrt(gx * gx + gy * gy + gz * gz) * 1000) / 1000;

    const newPt: TimePointTelemetry = {
      timeStr,
      chestRoll: chest?.euler_deg?.roll || 0,
      chestPitch: chest?.euler_deg?.pitch || 0,
      chestYaw: chest?.euler_deg?.yaw || 0,
      torsoRoll: torso?.euler_deg?.roll || 0,
      torsoPitch: torso?.euler_deg?.pitch || 0,
      torsoYaw: torso?.euler_deg?.yaw || 0,
      pelvisRoll: pelvis?.euler_deg?.roll || 0,
      pelvisPitch: pelvis?.euler_deg?.pitch || 0,
      pelvisYaw: pelvis?.euler_deg?.yaw || 0,
      accelChestMag: accelMag,
      gyroChestMag: gyroMag,
    };

    const newHistory = [...s.history.slice(-49), newPt];

    set({
      latestPacket: packet,
      packetRateHz: rateHz !== undefined ? rateHz : s.packetRateHz,
      missingSequences: missing !== undefined ? missing : s.missingSequences,
      history: newHistory,
    });
  },

  setRecordingState: (recording, paused, sessionId, name) =>
    set({
      isRecording: recording,
      isPaused: paused,
      activeSessionId: sessionId,
      activeSessionName: name !== undefined ? name : get().activeSessionName,
    }),

  setShowSkeleton: (show) => set({ showSkeleton: show }),
  setShowSensors: (show) => set({ showSensors: show }),
  setShowAxes: (show) => set({ showAxes: show }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
  setSmoothingFactor: (factor) => set({ smoothingFactor: factor }),
  setUseRawOrientation: (raw) => set({ useRawOrientation: raw }),

  calibrateOrientation: () => {
    const p = get().latestPacket;
    if (!p) return;
    set({
      calibrationOffsets: {
        chest: { ...p.sensors.chest.euler_deg },
        torso: { ...p.sensors.torso.euler_deg },
        pelvis: { ...p.sensors.pelvis.euler_deg },
      },
    });
  },

  resetCalibration: () =>
    set({
      calibrationOffsets: {
        chest: { roll: 0, pitch: 0, yaw: 0 },
        torso: { roll: 0, pitch: 0, yaw: 0 },
        pelvis: { roll: 0, pitch: 0, yaw: 0 },
      },
    }),

  setSimPattern: (pattern) => set({ simPattern: pattern }),
  setSimHz: (hz) => set({ simHz: hz }),

  setManualAngle: (sensor, axis, value) => {
    const current = get().manualAngles;
    set({
      manualAngles: {
        ...current,
        [sensor]: {
          ...current[sensor],
          [axis]: value,
        },
      },
    });
  },

  setSettings: (newSettings) => set((s) => ({ ...s, ...newSettings })),
}));
