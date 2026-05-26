export interface SSEMessage<T = unknown> {
  type: string;
  payload: T;
  _timestamp: string;
}

export interface SSEClientOptions {
  /** Returns a short-lived SSE token. The caller is responsible for fetching
   *  it from the backend /events/token endpoint using their auth mechanism. */
  getToken: () => Promise<string>;
  onMessage?: (message: SSEMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  /** Called when getToken fails repeatedly. Return true to stop reconnecting. */
  onTokenError?: (error: unknown) => boolean;
  heartbeatTimeoutMs?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_HEARTBEAT_TIMEOUT = 60000;
const DEFAULT_MAX_RECONNECT = 10;

export class SSEClient {
  private es: EventSource | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;
  private reconnectDelay = 1000;
  private reconnectAttempt = 0;
  private url: string;
  private options: SSEClientOptions;

  constructor(url: string, options: SSEClientOptions) {
    this.url = url;
    this.options = options;
  }

  async connect(): Promise<void> {
    if (this.isDisposed || this.es) return;

    let token: string;
    try {
      token = await this.options.getToken();
    } catch (err) {
      this.options.onError?.(
        err instanceof Error ? new Event(err.message) : new Event("token-error"),
      );
      // If onTokenError returns true, stop reconnecting
      if (this.options.onTokenError?.(err)) {
        return;
      }
      this.scheduleReconnect();
      return;
    }

    this.resetReconnectDelay();

    const fullUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    this.es = new EventSource(fullUrl);

    this.es.onopen = () => {
      this.resetReconnectDelay();
      this.options.onConnect?.();
      this.resetHeartbeat();
    };

    this.es.onmessage = (e) => {
      this.resetHeartbeat();
      if (e.data.startsWith(":ping")) return;

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
    this.reconnectAttempt++;
    const max = this.options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT;
    if (this.reconnectAttempt >= max) {
      this.options.onError?.(new Event("max-reconnect-attempts"));
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      void this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private resetReconnectDelay(): void {
    this.reconnectDelay = 1000;
    this.reconnectAttempt = 0;
  }

  private resetHeartbeat(): void {
    this.clearHeartbeat();
    const timeout = this.options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT;
    this.heartbeatTimer = setTimeout(() => {
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
