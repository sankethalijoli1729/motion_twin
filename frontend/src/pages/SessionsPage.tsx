import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchSessions, deleteSession, getExportUrl } from "../services/api";
import { SessionItem } from "../types/telemetry";
import {
  FolderClock,
  Play,
  Trash2,
  Download,
  FileJson,
  FileSpreadsheet,
  Search,
  Filter,
  Calendar,
  Layers,
  Cpu,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await fetchSessions(activityFilter || undefined, sourceFilter || undefined);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [activityFilter, sourceFilter]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete recording session #${id}? This action cannot be undone.`)) return;
    try {
      setDeletingId(id);
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.session_name.toLowerCase().includes(search.toLowerCase()) ||
    s.activity_label.toLowerCase().includes(search.toLowerCase()) ||
    (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-8 select-none">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div>
          <h1 className="text-lg font-bold text-textMain tracking-wide flex items-center space-x-2">
            <FolderClock className="w-5 h-5 text-teal-accent" />
            <span>Recorded Sessions & Historical Logs</span>
          </h1>
          <p className="text-xs text-textMuted">
            Review, replay, and export synchronized 3-IMU kinematic recordings stored in SQLite database.
          </p>
        </div>

        <button
          onClick={loadSessions}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-panel border border-borderSubtle text-xs text-textMain hover:bg-panelHover rounded transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-panel p-3 rounded-lg border border-borderSubtle">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 text-textDim absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by session name, activity, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain placeholder-textDim focus:outline-none focus:border-teal-accent"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-textDim" />
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="px-2 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain focus:outline-none focus:border-teal-accent"
          >
            <option value="">All Activities</option>
            <option value="general_motion">General Motion</option>
            <option value="forward_lean">Forward Lean</option>
            <option value="torso_twist">Torso Twist</option>
            <option value="lateral_tilt">Lateral Tilt</option>
            <option value="posture_calibration">Posture Calibration</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2 py-1.5 bg-[#0B0F12] border border-borderSubtle rounded text-xs text-textMain focus:outline-none focus:border-teal-accent"
          >
            <option value="">All Data Sources</option>
            <option value="hardware">Live Hardware</option>
            <option value="simulation">Simulation</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div className="p-12 text-center text-textMuted bg-panel border border-borderSubtle rounded-lg font-mono text-xs">
          <RefreshCw className="w-6 h-6 text-teal-accent animate-spin mx-auto mb-2" />
          Loading persistent session records...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center text-textMuted bg-panel border border-borderSubtle rounded-lg">
          <FolderClock className="w-8 h-8 text-textDim mx-auto mb-2" />
          <div className="text-sm font-semibold text-textMain mb-1">No Recording Sessions Found</div>
          <p className="text-xs text-textDim max-w-md mx-auto">
            Start a new recording from the Overview dashboard or run simulated motion capture to persist historical data.
          </p>
        </div>
      ) : (
        <div className="bg-panel border border-borderSubtle rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0F12] border-b border-borderSubtle font-mono text-[11px] text-textDim uppercase">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Session Name & Notes</th>
                  <th className="py-2.5 px-3">Activity</th>
                  <th className="py-2.5 px-3">Data Source</th>
                  <th className="py-2.5 px-3">Started</th>
                  <th className="py-2.5 px-3">Samples</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-panelHover transition-colors">
                    <td className="py-3 px-3 font-mono text-textDim">#{s.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-textMain">{s.session_name}</div>
                      {s.notes && (
                        <div className="text-[11px] text-textMuted italic truncate max-w-xs">
                          {s.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-panelHover border border-borderSubtle text-[11px]">
                        {s.activity_label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          s.data_source === "hardware"
                            ? "bg-accentBlue/20 text-accentBlue border border-accentBlue/30"
                            : "bg-teal-dim/30 text-teal-accent border border-teal-dim/40"
                        }`}
                      >
                        {s.data_source}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-textMuted text-[11px]">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-teal-accent font-bold">
                      {s.sample_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Playback Replay Button */}
                        <Link
                          to={`/replay/${s.id}`}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-teal-accent text-background font-semibold text-xs rounded hover:bg-[#68e2ce] transition-colors"
                          title="Open in 3D Motion Replay Player"
                        >
                          <Play className="w-3 h-3" />
                          <span>Replay</span>
                        </Link>

                        {/* Export CSV */}
                        <a
                          href={getExportUrl(s.id, "csv")}
                          download
                          className="p-1.5 text-textMuted hover:text-textMain hover:bg-panel rounded border border-borderSubtle"
                          title="Export CSV"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-accent" />
                        </a>

                        {/* Export JSON */}
                        <a
                          href={getExportUrl(s.id, "json")}
                          download
                          className="p-1.5 text-textMuted hover:text-textMain hover:bg-panel rounded border border-borderSubtle"
                          title="Export JSON"
                        >
                          <FileJson className="w-3.5 h-3.5 text-accentBlue" />
                        </a>

                        {/* Delete Session */}
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="p-1.5 text-textMuted hover:text-accentRed hover:bg-accentRed/10 rounded transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
