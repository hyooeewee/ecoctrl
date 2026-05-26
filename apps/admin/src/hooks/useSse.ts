import { useEffect, useRef, useCallback } from "react";
import { eventsApi } from "@/api/events";
import { useSseStore } from "@/store/sseStore";

const RECONNECT_DELAY_MS = 3000;
const TOKEN_REFRESH_BUFFER_MS = 5000;

export interface SseMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type SseMessageHandler = (message: SseMessage) => void;

export function useSse() {
  const setStatus = useSseStore((s) => s.setStatus);
  const setError = useSseStore((s) => s.setError);
  const status = useSseStore((s) => s.status);
  const handlersRef = useRef<Set<SseMessageHandler>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setStatus("connecting");
    setError(null);

    try {
      const { token, expiresIn } = await eventsApi.getToken();
      const url = `/api/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus("connected");
        setError(null);
      };

      es.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const msg: SseMessage = {
            type: (event as unknown as Record<string, string>).type || "message",
            payload: data,
            timestamp: (data._timestamp as string) || new Date().toISOString(),
          };
          handlersRef.current.forEach((h) => {
            try {
              h(msg);
            } catch {
              // Ignore handler errors
            }
          });
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        if (!isMountedRef.current) return;
        setStatus("error");
        setError("Connection error");
        es.close();
        esRef.current = null;
        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
      };

      const refreshDelay = Math.max(expiresIn * 1000 - TOKEN_REFRESH_BUFFER_MS, 5000);
      tokenRefreshTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          es.close();
          esRef.current = null;
          connect();
        }
      }, refreshDelay);
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect");
      reconnectTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) connect();
      }, RECONNECT_DELAY_MS);
    }
  }, [setStatus, setError]);

  const addHandler = useCallback((handler: SseMessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus("disconnected");
  }, [setStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, addHandler, disconnect };
}
