import React from "react";
import { TwinViewport } from "../three/TwinViewport";
import { useTwinStore } from "../store/useTwinStore";
import { setSimulationControl } from "../services/api";
import {
  Sliders,
  Play,
  RotateCcw,
  Layers,
  Compass,
  Cpu,
  Activity,
  CheckCircle2
} from "lucide-react";

export const DigitalTwinPage: React.FC = () => {
  const latestPacket = useTwinStore((s) => s.latestPacket);
  const simPattern = useTwinStore((s) => s.simPattern);
  const setSimPattern = useTwinStore((s) => s.setSimPattern);
  const simHz = useTwinStore((s) => s.simHz);
  const setSimHz = useTwinStore((s) => s.setSimHz);
  const manualAngles = useTwinStore((s) => s.manualAngles);
  const setManualAngle = useTwinStore((s) => s.setManualAngle);
  const smoothingFactor = useTwinStore((s) => s.smoothingFactor);
  const setSmoothingFactor = useTwinStore((s) => s.setSmoothingFactor);

  const patterns = [
    { id: "standing", label: "Neutral Upright (Micro-Sway)" },
    { id: "forward_lean", label: "Forward Lean (Flexion)" },
    { id: "backward_lean", label: "Backward Lean (Extension)" },
    { id: "left_tilt", label: "Left Lateral Tilt" },
    { id: "right_tilt", label: "Right Lateral Tilt" },
    { id: "torso_twist", label: "Axial Torso Twist" },
    { id: "walking_sway", label: "Walking Gait Sway" },
    { id: "manual", label: "Manual Direct Control" },
  ];

  const handleSelectPattern = async (pat: string) => {
    setSimPattern(pat);
    try {
      await setSimulationControl({ pattern: pat, speed_hz: simHz });
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSlider = async (sensor: "chest" | "torso" | "pelvis", axis: "roll" | "pitch" | "yaw", val: number) => {
    setManualAngle(sensor, axis, val);
    const updated = {
      ...manualAngles,
      [sensor]: {
        ...manualAngles[sensor],
        [axis]: val,
      },
    };
    try {
      await setSimulationControl({
        pattern: "manual",
        speed_hz: simHz,
        chest_roll: updated.chest.roll,
        chest_pitch: updated.chest.pitch,
        chest_yaw: updated.chest.yaw,
        torso_roll: updated.torso.roll,
        torso_pitch: updated.torso.pitch,
        torso_yaw: updated.torso.yaw,
        pelvis_roll: updated.pelvis.roll,
        pelvis_pitch: updated.pelvis.pitch,
        pelvis_yaw: updated.pelvis.yaw,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sensors = latestPacket?.sensors;

  return (
    <div className="space-y-4 pb-6">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-borderSubtle pb-2">
        <div>
          <h1 className="text-lg font-bold text-textMain tracking-wide">
            Interactive Human Digital Twin
          </h1>
          <p className="text-xs text-textMuted">
            3-Segment Articulated Kinematic Chain (Thoracic Spine, Lumbar Spine, Pelvis Base)
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-textDim">Filter Smoothing:</span>
          <span className="text-teal-accent font-bold">{(smoothingFactor * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Full-Size 3D Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <TwinViewport heightClass="h-[620px]" />

          {/* Quick HUD Bar */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-panel border border-borderSubtle p-2.5 rounded">
            <div>
              <span className="text-textDim uppercase">Upper Chest Q:</span>
              <div className="text-textMain font-bold">
                [{sensors?.chest?.quaternion?.w?.toFixed(2) || "1.00"},{" "}
                {sensors?.chest?.quaternion?.x?.toFixed(2) || "0.00"},{" "}
                {sensors?.chest?.quaternion?.y?.toFixed(2) || "0.00"},{" "}
                {sensors?.chest?.quaternion?.z?.toFixed(2) || "0.00"}]
              </div>
            </div>
            <div>
              <span className="text-textDim uppercase">Lower Torso Q:</span>
              <div className="text-textMain font-bold">
                [{sensors?.torso?.quaternion?.w?.toFixed(2) || "1.00"},{" "}
                {sensors?.torso?.quaternion?.x?.toFixed(2) || "0.00"},{" "}
                {sensors?.torso?.quaternion?.y?.toFixed(2) || "0.00"},{" "}
                {sensors?.torso?.quaternion?.z?.toFixed(2) || "0.00"}]
              </div>
            </div>
            <div>
              <span className="text-textDim uppercase">Pelvis Base Q:</span>
              <div className="text-textMain font-bold">
                [{sensors?.pelvis?.quaternion?.w?.toFixed(2) || "1.00"},{" "}
                {sensors?.pelvis?.quaternion?.x?.toFixed(2) || "0.00"},{" "}
                {sensors?.pelvis?.quaternion?.y?.toFixed(2) || "0.00"},{" "}
                {sensors?.pelvis?.quaternion?.z?.toFixed(2) || "0.00"}]
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Simulation Control Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Preset Motion Patterns */}
          <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 select-none">
            <div className="flex items-center space-x-2 border-b border-borderSubtle pb-2 mb-3">
              <Activity className="w-4 h-4 text-teal-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-textMain">
                Kinematic Motion Presets
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {patterns.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPattern(p.id)}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded transition-colors text-left ${
                    simPattern === p.id
                      ? "bg-teal-accent/20 border border-teal-dim/40 text-teal-accent font-semibold"
                      : "bg-[#0B0F12] border border-borderSubtle text-textMuted hover:text-textMain hover:bg-panelHover"
                  }`}
                >
                  <span>{p.label}</span>
                  {simPattern === p.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Control Sliders (Active when 'manual' selected or always adjustable) */}
          <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 select-none">
            <div className="flex items-center justify-between border-b border-borderSubtle pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-accentAmber" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-textMain">
                  Direct Segment Override
                </h2>
              </div>
              {simPattern !== "manual" && (
                <button
                  onClick={() => handleSelectPattern("manual")}
                  className="text-[10px] text-accentAmber hover:underline font-mono"
                >
                  Activate Manual
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Chest Controls */}
              <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle space-y-1.5">
                <div className="flex justify-between text-textMuted font-mono text-[11px]">
                  <span className="font-bold text-teal-accent">IMU 1 — Chest Pitch:</span>
                  <span>{manualAngles.chest.pitch}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={manualAngles.chest.pitch}
                  onChange={(e) => handleManualSlider("chest", "pitch", parseFloat(e.target.value))}
                  className="w-full accent-[#57D6C2] h-1.5 bg-panel rounded"
                />

                <div className="flex justify-between text-textMuted font-mono text-[11px] pt-1">
                  <span className="font-bold text-teal-accent">Chest Yaw (Twist):</span>
                  <span>{manualAngles.chest.yaw}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={manualAngles.chest.yaw}
                  onChange={(e) => handleManualSlider("chest", "yaw", parseFloat(e.target.value))}
                  className="w-full accent-[#57D6C2] h-1.5 bg-panel rounded"
                />
              </div>

              {/* Torso Controls */}
              <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle space-y-1.5">
                <div className="flex justify-between text-textMuted font-mono text-[11px]">
                  <span className="font-bold text-accentBlue">IMU 2 — Torso Pitch:</span>
                  <span>{manualAngles.torso.pitch}°</span>
                </div>
                <input
                  type="range"
                  min="-35"
                  max="35"
                  value={manualAngles.torso.pitch}
                  onChange={(e) => handleManualSlider("torso", "pitch", parseFloat(e.target.value))}
                  className="w-full accent-[#38BDF8] h-1.5 bg-panel rounded"
                />

                <div className="flex justify-between text-textMuted font-mono text-[11px] pt-1">
                  <span className="font-bold text-accentBlue">Torso Roll (Tilt):</span>
                  <span>{manualAngles.torso.roll}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={manualAngles.torso.roll}
                  onChange={(e) => handleManualSlider("torso", "roll", parseFloat(e.target.value))}
                  className="w-full accent-[#38BDF8] h-1.5 bg-panel rounded"
                />
              </div>

              {/* Pelvis Controls */}
              <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle space-y-1.5">
                <div className="flex justify-between text-textMuted font-mono text-[11px]">
                  <span className="font-bold text-accentAmber">IMU 3 — Pelvis Pitch:</span>
                  <span>{manualAngles.pelvis.pitch}°</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  value={manualAngles.pelvis.pitch}
                  onChange={(e) => handleManualSlider("pelvis", "pitch", parseFloat(e.target.value))}
                  className="w-full accent-[#F59E0B] h-1.5 bg-panel rounded"
                />
              </div>
            </div>
          </div>

          {/* Smoothing Setting */}
          <div className="bg-panel border border-borderSubtle rounded-lg p-3 select-none">
            <div className="flex justify-between text-xs text-textMuted font-mono mb-1.5">
              <span>Filter Smoothing Factor:</span>
              <span className="text-teal-accent">{(smoothingFactor * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.8"
              step="0.05"
              value={smoothingFactor}
              onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
              className="w-full accent-[#57D6C2] h-1.5 bg-[#0B0F12] rounded"
            />
            <p className="text-[10px] text-textDim mt-1">
              0% = Raw instantaneous sensor packets; higher values apply spherical quaternion slerp dampening.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
