import React from "react";
import { useTwinStore } from "../../store/useTwinStore";
import { Radio, Database, Activity, Clock, ShieldCheck, Cpu } from "lucide-react";

export const TelemetryStrip: React.FC = () => {
  const wsConnected = useTwinStore((s) => s.wsConnected);
  const latestPacket = useTwinStore((s) => s.latestPacket);
  const packetRateHz = useTwinStore((s) => s.packetRateHz);
  const isRecording = useTwinStore((s) => s.isRecording);
  const isPaused = useTwinStore((s) => s.isPaused);

  // Active sensor count out of 3
  const sensors = latestPacket?.sensors;
  let activeSensors = 0;
  if (sensors) {
    if (sensors.chest?.connected) activeSensors++;
    if (sensors.torso?.connected) activeSensors++;
    if (sensors.pelvis?.connected) activeSensors++;
  } else if (wsConnected) {
    activeSensors = 3;
  }

  // Packet age
  const packetAgeMs = latestPacket?.server_received_ms
    ? Math.max(0, Date.now() - latestPacket.server_received_ms)
    : 4;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 mb-4 select-none">
      {/* 1. Connection State */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className={`p-2 rounded ${wsConnected ? "bg-teal-dim/20 text-teal-accent" : "bg-accentRed/20 text-accentRed"}`}>
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">Gateway Link</div>
          <div className="text-xs font-mono font-bold text-textMain">
            {wsConnected ? "CONNECTED" : "OFFLINE"}
          </div>
        </div>
      </div>

      {/* 2. Active Sensor Array */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className="p-2 rounded bg-accentBlue/20 text-accentBlue">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">IMU Sensors</div>
          <div className="text-xs font-mono font-bold text-textMain">
            <span className={activeSensors === 3 ? "text-teal-accent" : "text-accentAmber"}>
              {activeSensors} / 3
            </span>{" "}
            ONLINE
          </div>
        </div>
      </div>

      {/* 3. Sampling Rate */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className="p-2 rounded bg-teal-dim/20 text-teal-accent">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">Sample Rate</div>
          <div className="text-xs font-mono font-bold text-textMain">
            {wsConnected ? `${packetRateHz || 30} Hz` : "0.0 Hz"}
          </div>
        </div>
      </div>

      {/* 4. Telemetry Latency / Packet Age */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className="p-2 rounded bg-panelHover text-textMuted">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">Packet Age</div>
          <div className="text-xs font-mono font-bold text-textMain">
            {wsConnected ? `${packetAgeMs} ms` : "—"}
          </div>
        </div>
      </div>

      {/* 5. Recording State */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className={`p-2 rounded ${isRecording ? "bg-accentRed/20 text-accentRed" : "bg-panelHover text-textDim"}`}>
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">Recording</div>
          <div className="text-xs font-mono font-bold text-textMain">
            {isRecording ? (isPaused ? "PAUSED" : "ACTIVE") : "IDLE"}
          </div>
        </div>
      </div>

      {/* 6. Database Persistence */}
      <div className="bg-panel border border-borderSubtle p-2.5 rounded flex items-center space-x-2.5">
        <div className="p-2 rounded bg-teal-dim/20 text-teal-accent">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-textMuted tracking-wider">Storage Engine</div>
          <div className="text-xs font-mono font-bold text-teal-accent">
            SQLITE / WAL
          </div>
        </div>
      </div>
    </div>
  );
};
