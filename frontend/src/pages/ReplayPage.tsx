import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import * as THREE from "three";
import { TwinViewport } from "../three/TwinViewport";
import { fetchSessionDetail, fetchSessionSamples, getExportUrl } from "../services/api";
import { SessionDetail, SampleItem } from "../types/telemetry";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  FolderClock,
  Download,
  Activity,
  Layers,
  ArrowLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from "recharts";

interface FrameData {
  seq: number;
  timeMs: number;
  timeStr: string;
  pelvisQ: THREE.Quaternion;
  torsoQ: THREE.Quaternion;
  chestQ: THREE.Quaternion;
  chestPitch: number;
  torsoPitch: number;
  pelvisPitch: number;
  chestRoll: number;
  torsoRoll: number;
  pelvisRoll: number;
  chestYaw: number;
}

export const ReplayPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const idNum = parseInt(sessionId || "1", 10);

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    loadSessionAndSamples();
  }, [idNum]);

  const loadSessionAndSamples = async () => {
    setLoading(true);
    setIsPlaying(false);
    setCurrentIndex(0);
    try {
      const detail = await fetchSessionDetail(idNum);
      setSession(detail);

      const rawSamples = await fetchSessionSamples(idNum, undefined, 5000);

      // Group raw samples by sequence number
      const seqMap = new Map<number, { [sensor: string]: SampleItem }>();
      rawSamples.forEach((s) => {
        if (!seqMap.has(s.sample_sequence)) {
          seqMap.set(s.sample_sequence, {});
        }
        seqMap.get(s.sample_sequence)![s.sensor_name] = s;
      });

      const parsedFrames: FrameData[] = [];
      const sortedSeqs = Array.from(seqMap.keys()).sort((a, b) => a - b);

      sortedSeqs.forEach((seq) => {
        const sensors = seqMap.get(seq)!;
        const c = sensors["chest"];
        const t = sensors["torso"];
        const p = sensors["pelvis"];

        const tMs = c?.device_timestamp_ms || t?.device_timestamp_ms || p?.device_timestamp_ms || 0;
        const date = new Date(tMs);
        const timeStr = `${date.getMinutes()}:${date.getSeconds()}.${Math.floor(date.getMilliseconds() / 100)}`;

        parsedFrames.push({
          seq,
          timeMs: tMs,
          timeStr,
          pelvisQ: new THREE.Quaternion(p?.quaternion_x || 0, p?.quaternion_y || 0, p?.quaternion_z || 0, p?.quaternion_w || 1),
          torsoQ: new THREE.Quaternion(t?.quaternion_x || 0, t?.quaternion_y || 0, t?.quaternion_z || 0, t?.quaternion_w || 1),
          chestQ: new THREE.Quaternion(c?.quaternion_x || 0, c?.quaternion_y || 0, c?.quaternion_z || 0, c?.quaternion_w || 1),
          chestPitch: c?.pitch_deg || 0,
          torsoPitch: t?.pitch_deg || 0,
          pelvisPitch: p?.pitch_deg || 0,
          chestRoll: c?.roll_deg || 0,
          torsoRoll: t?.roll_deg || 0,
          pelvisRoll: p?.roll_deg || 0,
          chestYaw: c?.yaw_deg || 0,
        });
      });

      setFrames(parsedFrames);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const intervalMs = Math.max(16, Math.floor(50 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return frames.length - 1;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, frames.length, playbackSpeed]);

  const currentFrame = frames[currentIndex] || null;

  return (
    <div className="space-y-4 pb-8 select-none">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div className="flex items-center space-x-3">
          <Link
            to="/sessions"
            className="p-1.5 text-textMuted hover:text-textMain hover:bg-panel rounded border border-borderSubtle transition-colors"
            title="Back to Sessions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-textMain tracking-wide flex items-center space-x-2">
              <span>Historical Motion Replay</span>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-dim/30 text-teal-accent border border-teal-dim/40 font-mono">
                Session #{idNum}
              </span>
            </h1>
            <p className="text-xs text-textMuted font-mono">
              {session?.session_name || "Loading..."} | Activity: {session?.activity_label} | {frames.length} synched kinematic frames
            </p>
          </div>
        </div>

        {session && (
          <div className="flex items-center space-x-2">
            <a
              href={getExportUrl(session.id, "csv")}
              download
              className="flex items-center space-x-1 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-textMain hover:bg-panelHover rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-teal-accent" />
              <span>Export CSV</span>
            </a>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center text-textMuted bg-panel border border-borderSubtle rounded-lg font-mono text-xs">
          Loading recorded kinematic sequence #{idNum}...
        </div>
      ) : frames.length === 0 ? (
        <div className="p-16 text-center text-textMuted bg-panel border border-borderSubtle rounded-lg">
          <AlertCircle className="w-8 h-8 text-accentAmber mx-auto mb-2" />
          <div className="text-sm font-semibold text-textMain mb-1">No Stored Sensor Samples</div>
          <p className="text-xs text-textDim max-w-md mx-auto mb-4">
            This session was created with 0 captured samples or was closed prematurely before telemetry ingestion.
          </p>
          <Link
            to="/sessions"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-teal-accent rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Select Another Session</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main 3D Viewport Replaying Historical Pose */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <TwinViewport
                heightClass="h-[520px]"
                customPelvisQuat={currentFrame?.pelvisQ}
                customTorsoQuat={currentFrame?.torsoQ}
                customChestQuat={currentFrame?.chestQ}
              />
            </div>

            {/* Frame Telemetry Snapshot */}
            <div className="lg:col-span-4 flex flex-col space-y-3 justify-between">
              <div className="bg-panel border border-borderSubtle rounded-lg p-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 mb-3">
                  Replay Frame Telemetry
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle">
                    <div className="text-textDim text-[11px] mb-1">FRAME CURSOR</div>
                    <div className="text-teal-accent font-bold text-sm">
                      #{currentIndex + 1} / {frames.length}
                    </div>
                    <div className="text-textMuted text-[11px] mt-0.5">
                      Timestamp: {currentFrame?.timeStr || "00:00.0"}
                    </div>
                  </div>

                  <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle space-y-1.5">
                    <div className="text-textDim text-[11px]">SEGMENT ORIENTATIONS (PITCH)</div>
                    <div className="flex justify-between">
                      <span className="text-teal-accent">Chest Pitch:</span>
                      <span className="text-textMain font-bold">{currentFrame?.chestPitch.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-accentBlue">Torso Pitch:</span>
                      <span className="text-textMain font-bold">{currentFrame?.torsoPitch.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-accentAmber">Pelvis Pitch:</span>
                      <span className="text-textMain font-bold">{currentFrame?.pelvisPitch.toFixed(1)}°</span>
                    </div>
                  </div>

                  <div className="bg-[#0B0F12] p-2.5 rounded border border-borderSubtle space-y-1">
                    <div className="text-textDim text-[11px]">RELATIVE KINEMATIC DELTA</div>
                    <div className="text-textMain">
                      Thoracolumbar:{" "}
                      <strong className="text-teal-accent">
                        {((currentFrame?.chestPitch || 0) - (currentFrame?.pelvisPitch || 0)).toFixed(1)}°
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Replay Scrubbing & Controller Bar */}
          <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 select-none space-y-3">
            {/* Timeline Scrubber Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-textMuted">
                <span>00:00</span>
                <span className="text-teal-accent font-bold">
                  Frame {currentIndex + 1} of {frames.length} ({((currentIndex / (frames.length - 1)) * 100).toFixed(0)}%)
                </span>
                <span>{frames[frames.length - 1]?.timeStr}</span>
              </div>
              <input
                type="range"
                min="0"
                max={frames.length - 1}
                value={currentIndex}
                onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
                className="w-full accent-[#57D6C2] h-2 bg-[#0B0F12] rounded cursor-pointer"
              />
            </div>

            {/* Playback Controls & Speed Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-teal-accent text-background font-bold text-xs rounded hover:bg-[#68e2ce] transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? "Pause" : "Play Replay"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex(0);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-[#0B0F12] border border-borderSubtle text-xs text-textMuted hover:text-textMain rounded transition-colors"
                  title="Reset to beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Playback Speed Toggles */}
              <div className="flex items-center space-x-1 bg-[#0B0F12] p-1 rounded border border-borderSubtle text-xs font-mono">
                <span className="text-textDim text-[10px] px-1.5">Speed:</span>
                {[0.25, 0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      playbackSpeed === spd
                        ? "bg-teal-dim/40 text-teal-accent font-bold"
                        : "text-textMuted hover:text-textMain"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Synchronized Replay Telemetry Chart */}
          <div className="bg-panel border border-borderSubtle rounded-lg p-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 mb-3 flex items-center justify-between">
              <span>Synchronized Kinematic Trajectory</span>
              <span className="text-[10px] font-mono text-teal-accent">
                Vertical line indicates current replay scrubber position
              </span>
            </div>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={frames}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                  <XAxis dataKey="timeStr" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="°" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {currentFrame && (
                    <ReferenceLine x={currentFrame.timeStr} stroke="#EF4444" strokeWidth={2} strokeDasharray="4 4" />
                  )}
                  <Line
                    type="monotone"
                    dataKey="chestPitch"
                    name="Chest Pitch"
                    stroke="#57D6C2"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="torsoPitch"
                    name="Torso Pitch"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pelvisPitch"
                    name="Pelvis Pitch"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
