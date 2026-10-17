import React from "react";
import { TwinViewport } from "../three/TwinViewport";
import { TelemetryStrip } from "../components/telemetry/TelemetryStrip";
import { SensorTelemetryCard } from "../components/telemetry/SensorTelemetryCard";
import { LiveChartsPanel } from "../components/telemetry/LiveChartsPanel";
import { RecordingControlBar } from "../components/telemetry/RecordingControlBar";
import { useTwinStore } from "../store/useTwinStore";
import { GitCommit } from "lucide-react";

export const OverviewPage: React.FC = () => {
  const latestPacket = useTwinStore((s) => s.latestPacket);
  const sensors = latestPacket?.sensors;

  // Kinematic Segment Angle Deltas (Pelvis -> Torso, Torso -> Chest)
  const pPitch = sensors?.pelvis?.euler_deg?.pitch || 0;
  const tPitch = sensors?.torso?.euler_deg?.pitch || 0;
  const cPitch = sensors?.chest?.euler_deg?.pitch || 0;

  const lumbarFlexDelta = (tPitch - pPitch).toFixed(1);
  const thoracicFlexDelta = (cPitch - tPitch).toFixed(1);

  return (
    <div className="space-y-3 pb-4">
      {/* Status Strip */}
      <TelemetryStrip />

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* 3D Viewport */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <TwinViewport heightClass="h-[500px]" />

          {/* Kinematic Delta Bar */}
          <div className="bg-[#141A1F] border border-[#1E2730] p-2 rounded text-[11px] flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <GitCommit className="w-3.5 h-3.5 text-[#57D6C2]" />
              <span className="font-mono text-[#6B7280] uppercase text-[10px]">
                Segment Deltas
              </span>
            </div>
            <div className="flex items-center space-x-4 font-mono">
              <div>
                <span className="text-[#6B7280]">Lumbar: </span>
                <span className="text-[#57D6C2] font-bold">{lumbarFlexDelta}°</span>
              </div>
              <div>
                <span className="text-[#6B7280]">Thoracic: </span>
                <span className="text-[#38BDF8] font-bold">{thoracicFlexDelta}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: IMU Cards */}
        <div className="lg:col-span-5 flex flex-col space-y-2 justify-between">
          <SensorTelemetryCard
            id="chest"
            name="IMU 1 — Chest"
            segmentRole="Thoracic Spine"
            data={sensors?.chest}
            muxChannel={0}
          />
          <SensorTelemetryCard
            id="torso"
            name="IMU 2 — Torso"
            segmentRole="Lumbar Spine"
            data={sensors?.torso}
            muxChannel={1}
          />
          <SensorTelemetryCard
            id="pelvis"
            name="IMU 3 — Pelvis"
            segmentRole="Base Root"
            data={sensors?.pelvis}
            muxChannel={2}
          />
        </div>
      </div>

      {/* Recording Controls */}
      <RecordingControlBar />

      {/* Live Charts */}
      <LiveChartsPanel />
    </div>
  );
};
