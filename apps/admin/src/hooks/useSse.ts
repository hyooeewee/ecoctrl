import { useEffect, useRef, useCallback } from "react";
import { SSEClient, type SSEMessage } from "@ecoctrl/shared";
import { auth } from "@/lib/auth";
import { API_PREFIX } from "@/lib/env";
import { useSseStore } from "@/store/sseStore";

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
  const clientRef = useRef<SSEClient | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current) return;

    const client = new SSEClient("/api/events", {
      getToken: async () => {
        const accessToken = auth.getAccessToken();
        if (!accessToken) throw new Error("No auth");
        const res = await fetch(`${API_PREFIX}/events/token`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
        const data = (await res.json()) as { token: string };
        return data.token;
      },
      onConnect: () => {
        setStatus("connected");
        setError(null);
      },
      onDisconnect: () => {
        setStatus("disconnected");
      },
      onError: () => {
        setStatus("error");
        setError("Connection error");
      },
      onMessage: (msg: SSEMessage) => {
        const sseMsg: SseMessage = {
          type: msg.type,
          payload: msg.payload as Record<string, unknown>,
          timestamp: msg._timestamp,
        };
        handlersRef.current.forEach((h) => {
          try {
            h(sseMsg);
          } catch {
            // Ignore handler errors
          }
        });
      },
    });

    clientRef.current = client;
    void client.connect();
  }, [setStatus, setError]);

  const disconnect = useCallback(() => {
    clientRef.current?.dispose();
    clientRef.current = null;
    setStatus("disconnected");
  }, [setStatus]);

  const addHandler = useCallback((handler: SseMessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, addHandler, disconnect };
}
