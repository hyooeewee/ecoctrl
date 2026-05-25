import { create } from "zustand";

interface WidgetDataState {
  /** Map of widgetId -> live data received via SSE */
  dataMap: Record<string, Record<string, unknown>>;
  setWidgetData: (widgetId: string, data: Record<string, unknown>) => void;
  removeWidgetData: (widgetId: string) => void;
  clearAll: () => void;
}

export const useWidgetDataStore = create<WidgetDataState>((set) => ({
  dataMap: {},
  setWidgetData: (widgetId, data) =>
    set((state) => ({
      dataMap: { ...state.dataMap, [widgetId]: data },
    })),
  removeWidgetData: (widgetId) =>
    set((state) => {
      const { [widgetId]: _, ...rest } = state.dataMap;
      return { dataMap: rest };
    }),
  clearAll: () => set({ dataMap: {} }),
}));
