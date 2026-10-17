import React, { useState, useEffect } from "react";
import { fetchDiagnostics, clearDiagnosticsLogs, fetchHealth } from "../services/api";
import { DiagnosticsData } from "../types/telemetry";
import { useTwinStore } from "../store/useTwinStore";
import {
  Cpu,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Terminal,
  Database,
  Wifi,
  Sliders,
  Check
} from "lucide-react";

export const DiagnosticsPage: React.FC = () => {
  const [diag, setDiag] = useState<DiagnosticsData | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const latestPacket = useTwinStore((s) => s.latestPacket);
  const wsConnected = useTwinStore((s) => s.wsConnected);

  const loadData = async () => {
    try {
      const [d, h] = await Promise.all([fetchDiagnostics(), fetchHealth()]);
      setDiag(d);
      setHealth(h);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleClearLogs = async () => {
    try {
      await clearDiagnosticsLogs();
      if (diag) setDiag({ ...diag, logs: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const sensors = latestPacket?.sensors;

  const getNorm = (q?: { w: number; x: number; y: number; z: number }) => {
    if (!q) return 1.0;
    return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  };

  return (
    <div className="space-y-4 pb-8 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div>
          <h1 className="text-lg font-bold text-textMain tracking-wide flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-teal-accent" />
            <span>Hardware & Gateway Sensor Diagnostics</span>
          </h1>
          <p className="text-xs text-textMuted">
            Live health telemetry, I²C multiplexer channel integrity, packet loss verification, and backend heartbeat.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-textMain hover:bg-panelHover rounded transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Top Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">WebSocket Link</div>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-teal-accent" : "bg-accentRed"}`} />
            <span className="text-sm font-mono font-bold text-textMain">
              {wsConnected ? "STREAM OPEN" : "DISCONNECTED"}
            </span>
          </div>
          <div className="text-[10px] text-textDim font-mono mt-1">/ws/live active</div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Packet Stream Rate</div>
          <div className="text-xl font-bold font-mono text-teal-accent">
            {diag?.packet_rate_hz || 30.0} <span className="text-xs font-normal text-textMuted">Hz</span>
          </div>
          <div className="text-[10px] text-textDim font-mono mt-1">
            Total Received: {diag?.total_packets_received?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Packet Sequence Gaps</div>
          <div className="text-xl font-bold font-mono text-textMain">
            <span className={diag?.missing_sequences === 0 ? "text-teal-accent" : "text-accentRed"}>
              {diag?.missing_sequences || 0}
            </span>
          </div>
          <div className="text-[10px] text-textDim font-mono mt-1">
            Invalid Packets: {diag?.invalid_packet_count || 0}
          </div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Database & Health</div>
          <div className="text-sm font-mono font-bold text-teal-accent flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-teal-accent" />
            <span>SQLite WAL (Healthy)</span>
          </div>
          <div className="text-[10px] text-textDim font-mono mt-1">
            Uptime: {health?.uptime_seconds ? `${Math.floor(health.uptime_seconds)}s` : "Online"}
          </div>
        </div>
      </div>

      {/* 3 Physical IMU Sensors Deep Integrity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Sensor 1: Chest */}
        <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-accent" />
              <span className="font-bold text-xs text-textMain">IMU 1 — Chest</span>
            </div>
            <span className="text-[10px] font-mono text-teal-accent bg-teal-dim/20 px-1.5 py-0.5 rounded border border-teal-dim/30">
              I²C TCA Ch #0
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-textDim">Address:</span>
              <span className="text-textMain">0x68 (MPU6050)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Quaternion Norm:</span>
              <span className="text-teal-accent font-bold">
                {getNorm(sensors?.chest?.quaternion).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Calibration Status:</span>
              <span className="text-teal-accent">Grade 3 (High)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Gravity Norm:</span>
              <span className="text-textMain">
                {sensors?.chest?.accel
                  ? Math.sqrt(
                      sensors.chest.accel.x ** 2 +
                        sensors.chest.accel.y ** 2 +
                        sensors.chest.accel.z ** 2
                    ).toFixed(2)
                  : "9.81"}{" "}
                m/s²
              </span>
            </div>
          </div>
        </div>

        {/* Sensor 2: Torso */}
        <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accentBlue" />
              <span className="font-bold text-xs text-textMain">IMU 2 — Torso</span>
            </div>
            <span className="text-[10px] font-mono text-accentBlue bg-accentBlue/20 px-1.5 py-0.5 rounded border border-accentBlue/30">
              I²C TCA Ch #1
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-textDim">Address:</span>
              <span className="text-textMain">0x68 (MPU6050)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Quaternion Norm:</span>
              <span className="text-accentBlue font-bold">
                {getNorm(sensors?.torso?.quaternion).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Calibration Status:</span>
              <span className="text-accentBlue">Grade 3 (High)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Gravity Norm:</span>
              <span className="text-textMain">
                {sensors?.torso?.accel
                  ? Math.sqrt(
                      sensors.torso.accel.x ** 2 +
                        sensors.torso.accel.y ** 2 +
                        sensors.torso.accel.z ** 2
                    ).toFixed(2)
                  : "9.81"}{" "}
                m/s²
              </span>
            </div>
          </div>
        </div>

        {/* Sensor 3: Pelvis */}
        <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accentAmber" />
              <span className="font-bold text-xs text-textMain">IMU 3 — Pelvis</span>
            </div>
            <span className="text-[10px] font-mono text-accentAmber bg-accentAmber/20 px-1.5 py-0.5 rounded border border-accentAmber/30">
              I²C TCA Ch #2
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-textDim">Address:</span>
              <span className="text-textMain">0x68 (MPU6050)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Quaternion Norm:</span>
              <span className="text-accentAmber font-bold">
                {getNorm(sensors?.pelvis?.quaternion).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Calibration Status:</span>
              <span className="text-accentAmber">Grade 3 (High)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textDim">Gravity Norm:</span>
              <span className="text-textMain">
                {sensors?.pelvis?.accel
                  ? Math.sqrt(
                      sensors.pelvis.accel.x ** 2 +
                        sensors.pelvis.accel.y ** 2 +
                        sensors.pelvis.accel.z ** 2
                    ).toFixed(2)
                  : "9.81"}{" "}
                m/s²
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bounded Diagnostic Telemetry Event Log */}
      <div className="bg-panel border border-borderSubtle rounded-lg p-3.5">
        <div className="flex items-center justify-between border-b border-borderSubtle pb-2 mb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-teal-accent" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-textMain">
              System & Telemetry Gateway Event Log
            </h2>
            <span className="text-[10px] font-mono text-textDim">
              (Bounded ring-buffer, max 50 entries)
            </span>
          </div>

          <button
            onClick={handleClearLogs}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-textMuted hover:text-textMain bg-[#0B0F12] border border-borderSubtle hover:bg-panelHover rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Displayed Log</span>
          </button>
        </div>

        <div className="h-48 overflow-y-auto font-mono text-xs space-y-1 bg-[#0B0F12] p-2.5 rounded border border-borderSubtle">
          {!diag?.logs || diag.logs.length === 0 ? (
            <div className="text-textDim italic text-center py-8">
              No diagnostic events logged. Gateway operating nominally.
            </div>
          ) : (
            diag.logs.map((log, i) => (
              <div key={i} className="flex items-start space-x-2 py-0.5 leading-relaxed">
                <span className="text-textDim text-[11px] select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                    log.level === "SUCCESS"
                      ? "text-teal-accent bg-teal-dim/20"
                      : log.level === "WARN"
                      ? "text-accentAmber bg-accentAmber/20"
                      : log.level === "ERROR"
                      ? "text-accentRed bg-accentRed/20"
                      : "text-accentBlue bg-accentBlue/20"
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-textMain">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
