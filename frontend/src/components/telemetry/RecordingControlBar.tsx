import React, { useState } from "react";
import { useTwinStore } from "../../store/useTwinStore";
import { startRecording, pauseRecording, resumeRecording, stopRecording } from "../../services/api";
import { Play, Pause, Square, Disc, AlertCircle, Info } from "lucide-react";

export const RecordingControlBar: React.FC = () => {
  const isRecording = useTwinStore((s) => s.isRecording);
  const isPaused = useTwinStore((s) => s.isPaused);
  const activeSessionId = useTwinStore((s) => s.activeSessionId);
  const activeSessionName = useTwinStore((s) => s.activeSessionName);
  const latestPacket = useTwinStore((s) => s.latestPacket);
  const setRecordingState = useTwinStore((s) => s.setRecordingState);

  const [sessionName, setSessionName] = useState("");
  const [activityLabel, setActivityLabel] = useState("general_motion");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const finalName = sessionName.trim() || `Session-${new Date().toISOString().slice(11, 19)}`;
    try {
      const sess = await startRecording({
        device_id: latestPacket?.device_id || "motiontwin-gateway-01",
        session_name: finalName,
        activity_label: activityLabel,
        data_source: latestPacket?.mode || "simulation",
        notes: notes.trim() || undefined,
      });
      setRecordingState(true, false, sess.id, sess.session_name);
      setSessionName("");
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to start recording session");
    }
  };

  const handlePause = async () => {
    try {
      await pauseRecording();
      setRecordingState(true, true, activeSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleResume = async () => {
    try {
      await resumeRecording();
      setRecordingState(true, false, activeSessionId);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleStop = async () => {
    if (!activeSessionId) return;
    try {
      await stopRecording(activeSessionId);
      setRecordingState(false, false, null);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="bg-panel border border-borderSubtle rounded-lg p-3 select-none">
      <div className="flex items-center justify-between border-b border-borderSubtle pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <Disc className={`w-4 h-4 ${isRecording ? "text-accentRed animate-spin" : "text-textMuted"}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-textMain">
            Session Capture & Persistence
          </span>
        </div>
        {isRecording && (
          <div className="flex items-center space-x-2 text-[11px] font-mono">
            <span className="text-textDim">Active:</span>
            <span className="text-teal-accent font-semibold">{activeSessionName}</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-2 p-1.5 bg-accentRed/10 border border-accentRed/30 rounded text-accentRed text-xs flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isRecording ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0B0F12] rounded border border-borderSubtle">
          <div className="flex items-center space-x-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPaused ? "bg-accentAmber" : "bg-accentRed animate-ping"
              }`}
            />
            <span className="font-mono text-textMuted">
              Status: <strong className="text-textMain">{isPaused ? "PAUSED (Telemetry Live)" : "RECORDING"}</strong>
            </span>
            <span className="text-textDim text-[11px] italic">
              {isPaused ? "— DB sample writes suspended; live view continues" : "— Flushing samples in asynchronous batches"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isPaused ? (
              <button
                type="button"
                onClick={handleResume}
                className="flex items-center space-x-1 px-3 py-1 bg-teal-accent text-background font-medium text-xs rounded hover:bg-[#68e2ce] transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center space-x-1 px-3 py-1 bg-panelHover border border-borderSubtle text-textMain text-xs rounded hover:bg-panel transition-colors"
              >
                <Pause className="w-3.5 h-3.5 text-accentAmber" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              className="flex items-center space-x-1 px-3 py-1 bg-accentRed/20 border border-accentRed/40 text-accentRed hover:bg-accentRed hover:text-white font-medium text-xs rounded transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop & Save Session</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleStart} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Session Name (e.g., Lumbar Flexion Run #3)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain placeholder-textDim focus:outline-none focus:border-teal-accent"
          />

          <select
            value={activityLabel}
            onChange={(e) => setActivityLabel(e.target.value)}
            className="px-2.5 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain focus:outline-none focus:border-teal-accent"
          >
            <option value="general_motion">General Motion</option>
            <option value="forward_lean">Forward Lean / Flexion</option>
            <option value="backward_lean">Backward Extension</option>
            <option value="torso_twist">Torso Axial Twist</option>
            <option value="lateral_tilt">Lateral Tilt</option>
            <option value="posture_calibration">Posture Calibration</option>
          </select>

          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-48 px-2.5 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain placeholder-textDim focus:outline-none focus:border-teal-accent"
          />

          <button
            type="submit"
            className="flex items-center space-x-1 px-3.5 py-1.5 bg-teal-accent text-background font-semibold text-xs rounded hover:bg-[#68e2ce] transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start Recording</span>
          </button>
        </form>
      )}
    </div>
  );
};
