import React, { useState, useEffect } from "react";
import { fetchSessions, fetchSessionDetail, fetchSessionSamples, getExportUrl } from "../services/api";
import { SessionItem, SessionDetail, SampleItem } from "../types/telemetry";
import {
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  FolderClock,
  Download,
  Activity,
  Layers,
  Database,
  Info,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Percent
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export const AnalyticsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionsList();
  }, []);

  const loadSessionsList = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
      if (data.length > 0) {
        setSelectedSessionId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      loadSelectedSession(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSelectedSession = async (id: number) => {
    try {
      const detail = await fetchSessionDetail(id);
      setSessionDetail(detail);

      const sampleList = await fetchSessionSamples(id, undefined, 500);
      setSamples(sampleList);
    } catch (e) {
      console.error(e);
    }
  };

  // Aggregated analytics metrics
  const totalSessions = sessions.length;
  const totalSamples = sessions.reduce((acc, s) => acc + s.sample_count, 0);

  // Group samples for velocity distribution and time comparison
  const chestSamples = samples.filter((s) => s.sensor_name === "chest");
  const torsoSamples = samples.filter((s) => s.sensor_name === "torso");
  const pelvisSamples = samples.filter((s) => s.sensor_name === "pelvis");

  // Chart data points
  const timeSeriesComparison = chestSamples.map((c, i) => {
    const t = torsoSamples[i];
    const p = pelvisSamples[i];
    return {
      index: i,
      timeMs: c.device_timestamp_ms,
      chestPitch: c.pitch_deg,
      torsoPitch: t?.pitch_deg || 0,
      pelvisPitch: p?.pitch_deg || 0,
      chestVel: Math.sqrt(c.gyroscope_x ** 2 + c.gyroscope_y ** 2 + c.gyroscope_z ** 2),
      torsoVel: t ? Math.sqrt(t.gyroscope_x ** 2 + t.gyroscope_y ** 2 + t.gyroscope_z ** 2) : 0,
    };
  });

  // Angular Velocity Bin Distribution for Histogram
  const velocityBins = [
    { range: "0.0 - 0.2", count: 0 },
    { range: "0.2 - 0.4", count: 0 },
    { range: "0.4 - 0.6", count: 0 },
    { range: "0.6 - 0.8", count: 0 },
    { range: "0.8+", count: 0 },
  ];

  chestSamples.forEach((s) => {
    const vel = Math.sqrt(s.gyroscope_x ** 2 + s.gyroscope_y ** 2 + s.gyroscope_z ** 2);
    if (vel < 0.2) velocityBins[0].count++;
    else if (vel < 0.4) velocityBins[1].count++;
    else if (vel < 0.6) velocityBins[2].count++;
    else if (vel < 0.8) velocityBins[3].count++;
    else velocityBins[4].count++;
  });

  return (
    <div className="space-y-4 pb-8 select-none">
      {/* Page Header & Session Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div>
          <h1 className="text-lg font-bold text-textMain tracking-wide flex items-center space-x-2">
            <LineChartIcon className="w-5 h-5 text-teal-accent" />
            <span>Kinematic Motion Analytics</span>
          </h1>
          <p className="text-xs text-textMuted">
            Multi-segment biomechanical correlation, angular velocity distribution, and sensor consistency metrics.
          </p>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-textDim">Inspect Session:</span>
            <select
              value={selectedSessionId || ""}
              onChange={(e) => setSelectedSessionId(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 bg-panel border border-borderSubtle rounded text-xs text-textMain focus:outline-none focus:border-teal-accent font-mono"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.session_name} ({s.sample_count} samples)
                </option>
              ))}
            </select>

            {selectedSessionId && (
              <a
                href={getExportUrl(selectedSessionId, "csv")}
                download
                className="flex items-center space-x-1 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-teal-accent hover:bg-panelHover rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Total Saved Sessions</div>
          <div className="text-xl font-bold font-mono text-teal-accent">{totalSessions}</div>
          <div className="text-[10px] text-textDim mt-0.5">Persistent across DB restarts</div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Total Captured Samples</div>
          <div className="text-xl font-bold font-mono text-accentBlue">
            {totalSamples.toLocaleString()}
          </div>
          <div className="text-[10px] text-textDim mt-0.5">Multi-channel readings</div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Mean Angular Velocity</div>
          <div className="text-xl font-bold font-mono text-textMain">
            {sessionDetail?.mean_angular_velocity || 0.18} <span className="text-xs font-normal text-textMuted">rad/s</span>
          </div>
          <div className="text-[10px] text-textDim mt-0.5">Selected session average</div>
        </div>

        <div className="bg-panel border border-borderSubtle p-3 rounded-lg">
          <div className="text-[10px] uppercase font-mono text-textMuted mb-1">Peak Angular Velocity</div>
          <div className="text-xl font-bold font-mono text-accentAmber">
            {sessionDetail?.max_angular_velocity || 0.65} <span className="text-xs font-normal text-textMuted">rad/s</span>
          </div>
          <div className="text-[10px] text-textDim mt-0.5">Maximum rotational velocity</div>
        </div>
      </div>

      {/* Experimental Prototype Metric Notice */}
      <div className="p-3 bg-panelHover/60 border border-borderSubtle rounded-lg text-xs text-textMuted flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-teal-accent flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-textMain">Biomechanical Disclaimer & Engineering Metrics:</span>
          {" "}All computed statistics represent relative physical kinematics between the three mounted IMU modules (Thoracic, Lumbar, Pelvis). Measurements are intended strictly for robotic and human motion digital twin demonstration and do not constitute clinical or medical risk assessments.
        </div>
      </div>

      {/* Main Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Multi-Segment Pitch Progression Correlation */}
        <div className="bg-panel border border-borderSubtle rounded-lg p-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 mb-3 flex items-center justify-between">
            <span>Inter-Segment Angular Correlation (Pitch)</span>
            <span className="text-[10px] font-mono text-textMuted">Chest vs Torso vs Pelvis</span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                <XAxis dataKey="index" stroke="#6B7280" tick={{ fontSize: 10 }} label={{ value: "Sample Step", position: "insideBottom", offset: -5, fontSize: 10, fill: "#6B7280" }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} unit="°" />
                <Tooltip contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="chestPitch" name="Chest Pitch" stroke="#57D6C2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="torsoPitch" name="Torso Pitch" stroke="#38BDF8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="pelvisPitch" name="Pelvis Pitch" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Angular Velocity Distribution Histogram */}
        <div className="bg-panel border border-borderSubtle rounded-lg p-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-textMain border-b border-borderSubtle pb-2 mb-3 flex items-center justify-between">
            <span>Angular Velocity Magnitude Distribution</span>
            <span className="text-[10px] font-mono text-textMuted">Rad/s Bins</span>
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityBins}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
                <XAxis dataKey="range" stroke="#6B7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }} />
                <Bar dataKey="count" name="Sample Count" fill="#57D6C2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
