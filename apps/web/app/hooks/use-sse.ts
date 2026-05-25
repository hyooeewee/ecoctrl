import { useEffect, useRef, useState, useCallback } from "react";
import { SSEClient, type SSEMessage } from "~/lib/sse";

export interface UseSseOptions {
  url: string;
  enabled?: boolean;
  onMessage?: (message: SSEMessage) => void;
  heartbeatTimeoutMs?: number;
}

export interface UseSseResult {
  isConnected: boolean;
  isReconnecting: boolean;
  lastMessage: SSEMessage | null;
  connect: () => void;
  disconnect: () => void;
}

export function useSse(options: UseSseOptions): UseSseResult {
  const { url, enabled = true, onMessage, heartbeatTimeoutMs } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<SSEMessage | null>(null);
  const clientRef = useRef<SSEClient | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current) return;

    const client = new SSEClient(url, {
      onConnect: () => {
        setIsConnected(true);
        setIsReconnecting(false);
      },
      onDisconnect: () => setIsConnected(false),
      onError: () => {
        setIsConnected(false);
        setIsReconnecting(true);
      },
      onMessage: (msg) => {
        setLastMessage(msg);
        onMessage?.(msg);
      },
      heartbeatTimeoutMs,
    });

    clientRef.current = client;
    void client.connect();
  }, [url, onMessage, heartbeatTimeoutMs]);

  const disconnect = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current = null;
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { isConnected, isReconnecting, lastMessage, connect, disconnect };
}
