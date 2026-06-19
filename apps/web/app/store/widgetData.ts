import { create } from "zustand";

interface WidgetDataState {
  /** Map of metricKey -> live data received via SSE */
  dataMap: Record<string, Record<string, unknown>>;
  setWidgetData: (metricKey: string, data: Record<string, unknown>) => void;
  removeWidgetData: (metricKey: string) => void;
  clearAll: () => void;
}

export const useWidgetDataStore = create<WidgetDataState>((set) => ({
  dataMap: {},
  setWidgetData: (metricKey, data) =>
    set((state) => ({
      dataMap: { ...state.dataMap, [metricKey]: data },
    })),
  removeWidgetData: (metricKey) =>
    set((state) => {
      const { [metricKey]: _, ...rest } = state.dataMap;
      return { dataMap: rest };
    }),
  clearAll: () => set({ dataMap: {} }),
}));
