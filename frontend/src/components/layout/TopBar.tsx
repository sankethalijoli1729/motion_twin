import React, { useState, useEffect } from "react";
import { useTwinStore } from "../../store/useTwinStore";
import { startRecording, pauseRecording, resumeRecording, stopRecording } from "../../services/api";
import {
  Activity,
  Circle,
  Square,
  Pause,
  Play,
  Cpu,
  Wifi,
  WifiOff,
  Settings as SettingsIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

export const TopBar: React.FC = () => {
  const wsConnected = useTwinStore((s) => s.wsConnected);
  const latestPacket = useTwinStore((s) => s.latestPacket);
  const packetRateHz = useTwinStore((s) => s.packetRateHz);
  const isRecording = useTwinStore((s) => s.isRecording);
  const isPaused = useTwinStore((s) => s.isPaused);
  const activeSessionId = useTwinStore((s) => s.activeSessionId);
  const activeSessionName = useTwinStore((s) => s.activeSessionName);
  const setRecordingState = useTwinStore((s) => s.setRecordingState);

  // Recording timer
  const [recSeconds, setRecSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } else if (!isRecording) {
      setRecSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const mode = latestPacket?.mode || "simulation";

  const handleStopRecording = async () => {
    if (!activeSessionId) return;
    try {
      await stopRecording(activeSessionId);
      setRecordingState(false, false, null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePause = async () => {
    try {
      if (isPaused) {
        await resumeRecording();
        setRecordingState(true, false, activeSessionId);
      } else {
        await pauseRecording();
        setRecordingState(true, true, activeSessionId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sensor count
  const sensors = latestPacket?.sensors;
  let activeSensors = 0;
  if (sensors) {
    if (sensors.chest?.connected) activeSensors++;
    if (sensors.torso?.connected) activeSensors++;
    if (sensors.pelvis?.connected) activeSensors++;
  } else if (wsConnected) {
    activeSensors = 3;
  }

  return (
    <header className="h-11 bg-[#141A1F] border-b border-[#1E2730] px-4 flex items-center justify-between z-20 select-none">
      {/* Brand */}
      <div className="flex items-center space-x-2.5">
        <div className="w-6 h-6 rounded bg-[#57D6C2]/15 border border-[#57D6C2]/30 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-[#57D6C2]" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm tracking-wide text-[#F3F4F6]">MotionTwin</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-[#57D6C2]/10 text-[#57D6C2] font-mono rounded border border-[#57D6C2]/20">
            v1.0
          </span>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="flex items-center space-x-2">
        {/* Mode */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#0B0F12] border border-[#1E2730]">
          <Cpu className={`w-3 h-3 ${mode === "hardware" ? "text-[#38BDF8]" : "text-[#57D6C2]"}`} />
          <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
            mode === "hardware" ? "text-[#38BDF8]" : "text-[#57D6C2]"
          }`}>
            {mode === "hardware" ? "Hardware" : "Simulation"}
          </span>
        </div>

        {/* Connection */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#0B0F12] border border-[#1E2730]">
          {wsConnected ? (
            <Wifi className="w-3 h-3 text-[#57D6C2]" />
          ) : (
            <WifiOff className="w-3 h-3 text-[#EF4444]" />
          )}
          <span className="text-[10px] font-mono text-[#9CA3AF]">
            {wsConnected ? `${packetRateHz || 30} Hz` : "Offline"}
          </span>
          {wsConnected && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#57D6C2]" />
          )}
        </div>

        {/* IMU Sensors */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#0B0F12] border border-[#1E2730]">
          <div className="flex items-center space-x-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < activeSensors ? "bg-[#57D6C2]" : "bg-[#2A3640]"
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-[#9CA3AF]">
            {activeSensors}/3
          </span>
        </div>

        {/* Recording */}
        {isRecording && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#EF4444]/8 border border-[#EF4444]/20">
            <span className={`w-1.5 h-1.5 rounded-full bg-[#EF4444] ${isPaused ? "" : "rec-pulse"}`} />
            <span className="text-[10px] font-mono text-[#EF4444] font-semibold">
              {isPaused ? "Paused" : "REC"}
            </span>
            <span className="text-[10px] font-mono text-[#F3F4F6] font-bold">
              {formatTimer(recSeconds)}
            </span>
            <div className="flex items-center space-x-0.5 ml-0.5">
              <button
                onClick={handleTogglePause}
                title={isPaused ? "Resume" : "Pause"}
                className="p-0.5 hover:bg-[#EF4444]/15 text-[#F3F4F6] rounded"
              >
                {isPaused ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
              </button>
              <button
                onClick={handleStopRecording}
                title="Stop"
                className="p-0.5 hover:bg-[#EF4444]/15 text-[#EF4444] rounded"
              >
                <Square className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right */}
      <Link
        to="/settings"
        className="p-1 text-[#6B7280] hover:text-[#F3F4F6] rounded transition-colors"
        title="Settings"
      >
        <SettingsIcon className="w-3.5 h-3.5" />
      </Link>
    </header>
  );
};
