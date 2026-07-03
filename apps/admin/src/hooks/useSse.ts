import { useEffect, useRef, useCallback } from "react";
import { SSEClient, type SSEMessage } from "@ecoctrl/shared";
import { auth } from "@/lib/auth";
import { post } from "@/api/request";
import { useSseStore } from "@/store/sseStore";
import { API_PREFIX } from "../lib/env";

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
  const statusRef = useRef(status);
  const handlersRef = useRef<Set<SseMessageHandler>>(new Set());
  const clientRef = useRef<SSEClient | null>(null);

  // Keep a mutable ref in sync with the latest status so event handlers
  // can check connection state without re-subscribing on every change.
  statusRef.current = status;

  const connect = useCallback(() => {
    if (clientRef.current) return;
    if (!auth.getAccessToken()) {
      setStatus("disconnected");
      return;
    }

    const client = new SSEClient(`${API_PREFIX}/events`, {
      getToken: async () => {
        const data = await post<{ token: string }>("/events/token", undefined, { noReload: true });
        return data.token;
      },
      onTokenError: () => {
        clientRef.current = null;
        setStatus("error");
        setError("Authentication failed");
        return true;
      },
      onConnect: () => {
        setStatus("connected");
        setError(null);
      },
      onDisconnect: () => {
        setStatus("disconnected");
      },
      onError: (err) => {
        console.error("[SSE]", err);
        setStatus("error");
        setError("Connection error");
      },
      onMessage: (msg: SSEMessage) => {
        const sseMsg: SseMessage = {
          type: msg.type,
          payload: msg.payload as Record<string, unknown>,
          timestamp: msg.timestamp,
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

    // When the tab returns to the foreground or the network recovers,
    // force a reconnect if the SSE connection is not currently healthy.
    // EventSource may silently stall while the tab is hidden, so a fresh
    // connection is more reliable than waiting for the heartbeat timeout.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && statusRef.current !== "connected") {
        clientRef.current?.dispose();
        clientRef.current = null;
        connect();
      }
    };

    const handleOnline = () => {
      if (statusRef.current !== "connected") {
        clientRef.current?.dispose();
        clientRef.current = null;
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [connect, disconnect]);

  return { status, addHandler, disconnect };
}
