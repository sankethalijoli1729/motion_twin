import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { useTwinStore } from "../../store/useTwinStore";
import { LineChart as ChartIcon, Gauge, Activity } from "lucide-react";

export const LiveChartsPanel: React.FC = () => {
  const history = useTwinStore((s) => s.history);
  const [activeTab, setActiveTab] = useState<"pitch" | "roll" | "yaw" | "dynamics">("pitch");

  return (
    <div className="bg-panel border border-borderSubtle rounded-lg p-3.5 select-none">
      {/* Chart Header & Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSubtle pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <ChartIcon className="w-4 h-4 text-teal-accent" />
          <span className="text-xs font-bold text-textMain uppercase tracking-wider">
            Real-Time Telemetry Stream
          </span>
          <span className="text-[10px] text-textMuted font-mono">
            ({history.length} samples buffer)
          </span>
        </div>

        {/* Chart View Toggle Tabs */}
        <div className="flex items-center space-x-1 bg-[#0B0F12] p-1 rounded border border-borderSubtle text-xs">
          <button
            onClick={() => setActiveTab("pitch")}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === "pitch"
                ? "bg-teal-dim/40 text-teal-accent font-semibold"
                : "text-textMuted hover:text-textMain"
            }`}
          >
            Pitch (Flexion)
          </button>
          <button
            onClick={() => setActiveTab("roll")}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === "roll"
                ? "bg-teal-dim/40 text-teal-accent font-semibold"
                : "text-textMuted hover:text-textMain"
            }`}
          >
            Roll (Lateral)
          </button>
          <button
            onClick={() => setActiveTab("yaw")}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === "yaw"
                ? "bg-teal-dim/40 text-teal-accent font-semibold"
                : "text-textMuted hover:text-textMain"
            }`}
          >
            Yaw (Twist)
          </button>
          <button
            onClick={() => setActiveTab("dynamics")}
            className={`px-2 py-0.5 rounded transition-colors ${
              activeTab === "dynamics"
                ? "bg-teal-dim/40 text-teal-accent font-semibold"
                : "text-textMuted hover:text-textMain"
            }`}
          >
            Velocity & Accel
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-52">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "pitch" ? (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
              <XAxis dataKey="timeStr" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[-50, 50]} unit="°" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
          ) : activeTab === "roll" ? (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
              <XAxis dataKey="timeStr" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[-45, 45]} unit="°" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="chestRoll"
                name="Chest Roll"
                stroke="#57D6C2"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="torsoRoll"
                name="Torso Roll"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pelvisRoll"
                name="Pelvis Roll"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : activeTab === "yaw" ? (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
              <XAxis dataKey="timeStr" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[-50, 50]} unit="°" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="chestYaw"
                name="Chest Yaw"
                stroke="#57D6C2"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="torsoYaw"
                name="Torso Yaw"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="pelvisYaw"
                name="Pelvis Yaw"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
              <XAxis dataKey="timeStr" stroke="#6B7280" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" stroke="#6B7280" tick={{ fontSize: 10 }} unit=" m/s²" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" tick={{ fontSize: 10 }} unit=" rad/s" />
              <Tooltip
                contentStyle={{ backgroundColor: "#141A1F", borderColor: "#222C35", fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="accelChestMag"
                name="Chest Accel Norm"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="gyroChestMag"
                name="Chest Gyro Norm"
                stroke="#57D6C2"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
