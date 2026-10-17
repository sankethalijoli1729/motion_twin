import React, { useState } from "react";
import { useTwinStore } from "../store/useTwinStore";
import {
  Sliders,
  RotateCcw,
  Save,
  CheckCircle2,
  Cpu,
  Wifi,
  Compass,
  Layers,
  Settings as SettingsIcon,
  ShieldAlert
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const backendUrl = useTwinStore((s) => s.backendUrl);
  const wsUrl = useTwinStore((s) => s.wsUrl);
  const invertPitch = useTwinStore((s) => s.invertPitch);
  const invertRoll = useTwinStore((s) => s.invertRoll);
  const invertYaw = useTwinStore((s) => s.invertYaw);
  const smoothingFactor = useTwinStore((s) => s.smoothingFactor);
  const simHz = useTwinStore((s) => s.simHz);
  const setSettings = useTwinStore((s) => s.setSettings);
  const setSmoothingFactor = useTwinStore((s) => s.setSmoothingFactor);
  const setSimHz = useTwinStore((s) => s.setSimHz);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [localBackendUrl, setLocalBackendUrl] = useState(backendUrl);
  const [localWsUrl, setLocalWsUrl] = useState(wsUrl);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings({
      backendUrl: localBackendUrl,
      wsUrl: localWsUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setLocalBackendUrl("http://127.0.0.1:8000");
    setLocalWsUrl("ws://127.0.0.1:8000/ws/live");
    setSettings({
      backendUrl: "http://127.0.0.1:8000",
      wsUrl: "ws://127.0.0.1:8000/ws/live",
      invertPitch: false,
      invertRoll: false,
      invertYaw: false,
    });
    setSmoothingFactor(0.15);
    setSimHz(30);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-4xl space-y-4 pb-8 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div>
          <h1 className="text-lg font-bold text-textMain tracking-wide flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-teal-accent" />
            <span>Telemetry & Platform Settings</span>
          </h1>
          <p className="text-xs text-textMuted">
            Configure gateway connectivity endpoints, coordinate axes transformations, and visualization smoothing.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-textMuted hover:text-textMain hover:bg-panelHover rounded transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-teal-accent/10 border border-teal-dim/40 rounded-lg text-teal-accent text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Settings successfully updated and applied!</span>
        </div>
      )}

      {/* Network & Backend Gateway Settings Form */}
      <form onSubmit={handleSave} className="bg-panel border border-borderSubtle rounded-lg p-4 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-accentBlue" />
          <span>Gateway & Networking Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-textMuted font-mono text-[11px] mb-1">
              Backend REST API URL
            </label>
            <input
              type="text"
              value={localBackendUrl}
              onChange={(e) => setLocalBackendUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain font-mono focus:outline-none focus:border-teal-accent"
            />
            <p className="text-[10px] text-textDim mt-1">Default: http://127.0.0.1:8000</p>
          </div>

          <div>
            <label className="block text-textMuted font-mono text-[11px] mb-1">
              Live Telemetry WebSocket URL
            </label>
            <input
              type="text"
              value={localWsUrl}
              onChange={(e) => setLocalWsUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain font-mono focus:outline-none focus:border-teal-accent"
            />
            <p className="text-[10px] text-textDim mt-1">Default: ws://127.0.0.1:8000/ws/live</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-teal-accent text-background font-bold text-xs rounded hover:bg-[#68e2ce] transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Network Endpoints</span>
          </button>
        </div>
      </form>

      {/* Kinematics Coordinate Transformation */}
      <div className="bg-panel border border-borderSubtle rounded-lg p-4 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 flex items-center space-x-2">
          <Compass className="w-4 h-4 text-teal-accent" />
          <span>Coordinate Frame Transformations & Inversion</span>
        </div>

        <p className="text-xs text-textMuted">
          Depending on the physical mounting orientation of the MPU6050 sensors on the wearable harness (chest, lower back, pelvis), you may invert specific rotation axes to match natural human flexion:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex items-center space-x-2.5 p-3 bg-[#0B0F12] rounded border border-borderSubtle cursor-pointer hover:bg-panelHover transition-colors">
            <input
              type="checkbox"
              checked={invertPitch}
              onChange={(e) => setSettings({ invertPitch: e.target.checked })}
              className="accent-[#57D6C2] rounded w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-textMain">Invert Pitch (X)</div>
              <div className="text-[10px] text-textMuted">Forward / Backward Lean</div>
            </div>
          </label>

          <label className="flex items-center space-x-2.5 p-3 bg-[#0B0F12] rounded border border-borderSubtle cursor-pointer hover:bg-panelHover transition-colors">
            <input
              type="checkbox"
              checked={invertRoll}
              onChange={(e) => setSettings({ invertRoll: e.target.checked })}
              className="accent-[#57D6C2] rounded w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-textMain">Invert Roll (Z)</div>
              <div className="text-[10px] text-textMuted">Lateral Left / Right Tilt</div>
            </div>
          </label>

          <label className="flex items-center space-x-2.5 p-3 bg-[#0B0F12] rounded border border-borderSubtle cursor-pointer hover:bg-panelHover transition-colors">
            <input
              type="checkbox"
              checked={invertYaw}
              onChange={(e) => setSettings({ invertYaw: e.target.checked })}
              className="accent-[#57D6C2] rounded w-4 h-4"
            />
            <div>
              <div className="text-xs font-bold text-textMain">Invert Yaw (Y)</div>
              <div className="text-[10px] text-textMuted">Axial Torso Twist</div>
            </div>
          </label>
        </div>
      </div>

      {/* Rendering & Engine Performance Settings */}
      <div className="bg-panel border border-borderSubtle rounded-lg p-4 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-accentAmber" />
          <span>Engine Performance & Visual Filtering</span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between font-mono mb-1 text-textMuted">
              <span>Spherical Linear Interpolation (Slerp) Smoothing:</span>
              <span className="text-teal-accent font-bold">{(smoothingFactor * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={smoothingFactor}
              onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
              className="w-full accent-[#57D6C2] h-2 bg-[#0B0F12] rounded"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono mb-1 text-textMuted">
              <span>Simulation Ingestion Frequency:</span>
              <span className="text-accentBlue font-bold">{simHz} Hz</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={simHz}
              onChange={(e) => setSimHz(parseInt(e.target.value, 10))}
              className="w-full accent-[#38BDF8] h-2 bg-[#0B0F12] rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
