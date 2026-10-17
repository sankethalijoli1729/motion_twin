import { useTwinStore } from "../store/useTwinStore";

class TwinWebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;
  private pingInterval: any = null;

  public connect(url: string = "ws://127.0.0.1:8000/ws/live") {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isConnecting = true;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnecting = false;
        useTwinStore.getState().setWsConnected(true);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        // Heartbeat ping every 10s
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: "ping" }));
          }
        }, 10000);
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "telemetry" && payload.data) {
            const rateHz = payload.meta?.rate_hz;
            const missing = payload.meta?.missing_sequences;
            useTwinStore.getState().updateTelemetry(payload.data, rateHz, missing);

            // Update recording status sync
            if (payload.meta?.recording) {
              const rec = payload.meta.recording;
              useTwinStore.getState().setRecordingState(rec.is_recording, rec.is_paused, rec.active_session_id);
            }
          }
        } catch (e) {
          console.error("[WS] Parse error:", e);
        }
      };

      this.socket.onerror = (err) => {
        console.warn("[WS] Error:", err);
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        useTwinStore.getState().setWsConnected(false);
        if (this.pingInterval) clearInterval(this.pingInterval);

        // Retry connection every 2s
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          this.connect(url);
        }, 2000);
      };
    } catch (e) {
      this.isConnecting = false;
      this.reconnectTimer = setTimeout(() => this.connect(url), 2000);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    useTwinStore.getState().setWsConnected(false);
  }
}

export const wsClient = new TwinWebSocketClient();
