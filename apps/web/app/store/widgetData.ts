import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WidgetStoreEntry {
  /** Render config (from dataJson, excluding initData) */
  config: Record<string, unknown>;
  /** Initial data (from dataJson.initData) */
  initData: Record<string, unknown>;
  /** Live data from SSE (overrides initData when present) */
  liveData?: Record<string, unknown>;
  /** SSE timestamp (Unix ms) — used for ordering */
  lastUpdate?: number;
}

interface WidgetDataState {
  /** Map of metricKey -> widget store entry */
  entries: Record<string, WidgetStoreEntry>;
  /** Initialize store from REST response (called once on page load) */
  initFromDashboard: (
    widgets: Array<{ metricKey: string; dataJson: Record<string, unknown> }>,
  ) => void;
  /** Set live data from SSE (timestamp-based ordering) */
  setWidgetData: (metricKey: string, data: Record<string, unknown>, timestamp: number) => void;
  /** Clear live data, fall back to initData */
  clearWidgetData: (metricKey: string) => void;
  /** Clear all entries */
  clearAll: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWidgetDataStore = create<WidgetDataState>((set) => ({
  entries: {},

  initFromDashboard: (widgets) =>
    set((state) => {
      const next = { ...state.entries };
      for (const widget of widgets) {
        const { initData, ...config } = widget.dataJson;
        // Only init if not already present (don't overwrite SSE data)
        if (!next[widget.metricKey]) {
          next[widget.metricKey] = {
            config,
            initData: (initData as Record<string, unknown>) ?? {},
            liveData: undefined,
            lastUpdate: undefined,
          };
        }
      }
      return { entries: next };
    }),

  setWidgetData: (metricKey, data, timestamp) =>
    set((state) => {
      const existing = state.entries[metricKey];
      // Reject stale or duplicate timestamps
      if (existing?.lastUpdate && timestamp <= existing.lastUpdate) {
        return state;
      }
      return {
        entries: {
          ...state.entries,
          [metricKey]: {
            ...existing,
            liveData: data,
            lastUpdate: timestamp,
          },
        },
      };
    }),

  clearWidgetData: (metricKey) =>
    set((state) => {
      const existing = state.entries[metricKey];
      if (!existing) return state;
      return {
        entries: {
          ...state.entries,
          [metricKey]: {
            ...existing,
            liveData: undefined,
            lastUpdate: undefined,
          },
        },
      };
    }),

  clearAll: () => set({ entries: {} }),
}));
