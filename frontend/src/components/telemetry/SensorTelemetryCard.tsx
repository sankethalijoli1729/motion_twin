import React from "react";
import { SensorData } from "../../types/telemetry";
import { Crosshair, AlertCircle, CheckCircle2 } from "lucide-react";

interface SensorCardProps {
  id: string;
  name: string;
  segmentRole: string;
  data?: SensorData;
  muxChannel: number;
}

export const SensorTelemetryCard: React.FC<SensorCardProps> = ({
  id,
  name,
  segmentRole,
  data,
  muxChannel,
}) => {
  const roll = data?.euler_deg?.roll ?? 0.0;
  const pitch = data?.euler_deg?.pitch ?? 0.0;
  const yaw = data?.euler_deg?.yaw ?? 0.0;

  const qw = data?.quaternion?.w ?? 1.0;
  const qx = data?.quaternion?.x ?? 0.0;
  const qy = data?.quaternion?.y ?? 0.0;
  const qz = data?.quaternion?.z ?? 0.0;

  const ax = data?.accel?.x ?? 0.0;
  const ay = data?.accel?.y ?? 0.0;
  const az = data?.accel?.z ?? 9.81;

  const gx = data?.gyro?.x ?? 0.0;
  const gy = data?.gyro?.y ?? 0.0;
  const gz = data?.gyro?.z ?? 0.0;

  const isConnected = data?.connected ?? true;
  const isValid = data?.data_valid ?? true;

  return (
    <div className="bg-panel border border-borderSubtle rounded-lg p-3 select-none flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-borderSubtle pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-accent shadow-[0_0_8px_rgba(87,214,194,0.6)]" />
          <div>
            <div className="text-xs font-bold text-textMain">{name}</div>
            <div className="text-[10px] text-textMuted font-mono">
              {segmentRole} <span className="text-textDim">| Ch #{muxChannel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {isConnected && isValid ? (
            <span className="flex items-center text-[10px] font-mono text-teal-accent bg-teal-dim/20 px-1.5 py-0.5 rounded border border-teal-dim/30">
              <CheckCircle2 className="w-3 h-3 mr-1" /> ACTIVE
            </span>
          ) : (
            <span className="flex items-center text-[10px] font-mono text-accentRed bg-accentRed/20 px-1.5 py-0.5 rounded border border-accentRed/30">
              <AlertCircle className="w-3 h-3 mr-1" /> FAULT
            </span>
          )}
        </div>
      </div>

      {/* Main Euler Angles Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3 bg-[#0B0F12] p-2 rounded border border-borderSubtle">
        <div className="text-center">
          <div className="text-[10px] uppercase font-mono text-textMuted">Roll</div>
          <div className="text-sm font-mono font-bold text-teal-accent mono-num">
            {roll.toFixed(1)}°
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-mono text-textMuted">Pitch</div>
          <div className="text-sm font-mono font-bold text-accentBlue mono-num">
            {pitch.toFixed(1)}°
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase font-mono text-textMuted">Yaw</div>
          <div className="text-sm font-mono font-bold text-accentAmber mono-num">
            {yaw.toFixed(1)}°
          </div>
        </div>
      </div>

      {/* Quaternion Values */}
      <div className="mb-2.5">
        <div className="text-[10px] uppercase font-mono text-textDim mb-1 flex items-center justify-between">
          <span>Unit Quaternion (W, X, Y, Z)</span>
          <span className="text-[9px] text-teal-accent">
            |Q|: {Math.sqrt(qw*qw + qx*qx + qy*qy + qz*qz).toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-[11px] font-mono bg-panelHover/60 p-1.5 rounded text-center">
          <div><span className="text-textDim">w:</span> {qw.toFixed(2)}</div>
          <div><span className="text-textDim">x:</span> {qx.toFixed(2)}</div>
          <div><span className="text-textDim">y:</span> {qy.toFixed(2)}</div>
          <div><span className="text-textDim">z:</span> {qz.toFixed(2)}</div>
        </div>
      </div>

      {/* Accelerometer & Gyroscope Telemetry */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-textMuted bg-[#0B0F12] p-1.5 rounded border border-borderSubtle">
        <div>
          <div className="text-textDim uppercase">Accel (m/s²)</div>
          <div className="text-textMain mono-num">
            [{ax.toFixed(1)}, {ay.toFixed(1)}, {az.toFixed(1)}]
          </div>
        </div>
        <div>
          <div className="text-textDim uppercase">Gyro (rad/s)</div>
          <div className="text-textMain mono-num">
            [{gx.toFixed(2)}, {gy.toFixed(2)}, {gz.toFixed(2)}]
          </div>
        </div>
      </div>
    </div>
  );
};
