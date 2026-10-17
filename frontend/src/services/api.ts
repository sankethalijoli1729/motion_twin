import { SessionItem, SessionDetail, SampleItem, DiagnosticsData } from "../types/telemetry";

const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchDevices() {
  const res = await fetch(`${API_BASE}/devices`);
  return res.json();
}

export async function fetchSessions(activity?: string, dataSource?: string): Promise<SessionItem[]> {
  const params = new URLSearchParams();
  if (activity) params.append("activity", activity);
  if (dataSource) params.append("data_source", dataSource);
  const res = await fetch(`${API_BASE}/sessions?${params.toString()}`);
  return res.json();
}

export async function fetchSessionDetail(id: number): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to load session details");
  return res.json();
}

export async function fetchSessionSamples(id: number, sensor?: string, limit = 2000): Promise<SampleItem[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (sensor) params.append("sensor", sensor);
  const res = await fetch(`${API_BASE}/sessions/${id}/samples?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load session samples");
  return res.json();
}

export async function startRecording(data: {
  device_id?: string;
  session_name: string;
  activity_label?: string;
  data_source?: string;
  notes?: string;
}): Promise<SessionItem> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to start recording session");
  return res.json();
}

export async function pauseRecording(): Promise<any> {
  const res = await fetch(`${API_BASE}/sessions/pause`, { method: "POST" });
  return res.json();
}

export async function resumeRecording(): Promise<any> {
  const res = await fetch(`${API_BASE}/sessions/resume`, { method: "POST" });
  return res.json();
}

export async function stopRecording(id: number): Promise<SessionItem> {
  const res = await fetch(`${API_BASE}/sessions/${id}/stop`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to stop recording session");
  return res.json();
}

export async function deleteSession(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}

export async function fetchDiagnostics(): Promise<DiagnosticsData> {
  const res = await fetch(`${API_BASE}/diagnostics`);
  return res.json();
}

export async function clearDiagnosticsLogs(): Promise<any> {
  const res = await fetch(`${API_BASE}/diagnostics/clear-logs`, { method: "POST" });
  return res.json();
}

export async function setSimulationControl(control: {
  pattern: string;
  speed_hz?: number;
  chest_roll?: number;
  chest_pitch?: number;
  chest_yaw?: number;
  torso_roll?: number;
  torso_pitch?: number;
  torso_yaw?: number;
  pelvis_roll?: number;
  pelvis_pitch?: number;
  pelvis_yaw?: number;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/simulation/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(control),
  });
  return res.json();
}

export function getExportUrl(id: number, format: "csv" | "json"): string {
  return `${API_BASE}/sessions/${id}/export?format=${format}`;
}
