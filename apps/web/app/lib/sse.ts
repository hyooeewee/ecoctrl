import { useAuthStore } from "~/store/auth";
import { API_PREFIX } from "~/lib/env";

export interface SSEMessage<T = unknown> {
  type: string;
  payload: T;
  _timestamp: string;
}

export interface SSEClientOptions {
  onMessage?: (message: SSEMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  heartbeatTimeoutMs?: number;
}

const DEFAULT_HEARTBEAT_TIMEOUT = 60000;

export class SSEClient {
  private es: EventSource | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;
  private url: string;
  private options: SSEClientOptions;

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url;
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.isDisposed || this.es) return;

    // Fetch a short-lived SSE token using the current access token
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      this.options.onError?.(new Event("no-auth") as Event);
      return;
    }

    let token: string;
    try {
      const res = await fetch(`${API_PREFIX}/events/token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const data = (await res.json()) as { token: string };
      token = data.token;
    } catch (err) {
      this.options.onError?.(err instanceof Error ? new Event(err.message) : new Event("token-error"));
      this.scheduleReconnect();
      return;
    }

    const fullUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(fullUrl);

    this.es.onopen = () => {
      this.options.onConnect?.();
      this.resetHeartbeat();
    };

    this.es.onmessage = (e) => {
      this.resetHeartbeat();
      if (e.data.startsWith(":ping")) return; // Ignore heartbeat comments

      try {
        const parsed = JSON.parse(e.data) as SSEMessage;
        this.options.onMessage?.(parsed);
      } catch {
        // Ignore malformed messages
      }
    };

    this.es.onerror = (err) => {
      this.options.onError?.(err);
      this.disconnect();
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.clearTimers();
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    this.options.onDisconnect?.();
  }

  dispose(): void {
    this.isDisposed = true;
    this.disconnect();
    this.clearTimers();
  }

  private scheduleReconnect(): void {
    if (this.isDisposed) return;
    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, 3000);
  }

  private resetHeartbeat(): void {
    this.clearHeartbeat();
    const timeout = this.options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT;
    this.heartbeatTimer = setTimeout(() => {
      // No heartbeat received, force reconnect
      this.disconnect();
      this.scheduleReconnect();
    }, timeout);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
