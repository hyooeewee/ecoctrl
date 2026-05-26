import { create } from "zustand";

export type SseConnectionStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface SseState {
  status: SseConnectionStatus;
  lastError: string | null;
  unread: Record<string, number>;
  lastEventId: string | null;

  setStatus: (status: SseConnectionStatus) => void;
  setError: (error: string | null) => void;
  setLastEventId: (id: string | null) => void;
  incrementUnread: (type: string) => void;
  clearUnread: (type: string) => void;
  reset: () => void;
}

export const useSseStore = create<SseState>((set) => ({
  status: "idle",
  lastError: null,
  unread: {},
  lastEventId: null,

  setStatus: (status) => set({ status }),
  setError: (error) => set({ lastError: error }),
  setLastEventId: (id) => set({ lastEventId: id }),
  incrementUnread: (type) =>
    set((state) => ({
      unread: { ...state.unread, [type]: (state.unread[type] ?? 0) + 1 },
    })),
  clearUnread: (type) =>
    set((state) => ({
      unread: { ...state.unread, [type]: 0 },
    })),
  reset: () => set({ status: "idle", lastError: null, unread: {}, lastEventId: null }),
}));
