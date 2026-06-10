import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserPreferences } from "@ecoctrl/shared";
import type { LogNodeItem } from "@/components/LogViewer";

export interface LogViewerData {
  type: "execution" | "test";
  workflowId: string;
  executionId?: string;
  testResult?: {
    status: string;
    error?: string;
    nodeLogs?: LogNodeItem[];
  };
  returnTab?: string;
}

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;

  energyTab: string;
  setEnergyTab: (tab: string) => void;

  faultsTab: string;
  setFaultsTab: (tab: string) => void;

  dashboardModelTab: string;
  setDashboardModelTab: (tab: string) => void;

  modelsTab: string;
  setModelsTab: (tab: string) => void;

  workflowsTab: string;
  setWorkflowsTab: (tab: string) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Full-screen page states (not persisted)
  canvasWorkflowId: string | null;
  setCanvasWorkflowId: (id: string | null) => void;
  logViewerData: LogViewerData | null;
  setLogViewerData: (data: LogViewerData | null) => void;

  // Local overrides for user preferences. Keys present here take precedence
  // over database defaults. Allows device/session-level customization.
  preferencesOverride: Partial<UserPreferences>;
  setPreferenceOverride: (patch: Partial<UserPreferences>) => void;
  clearPreferenceOverrides: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: "overview",
      setActiveTab: (tab) => set({ activeTab: tab }),

      energyTab: "overview",
      setEnergyTab: (tab) => set({ energyTab: tab }),

      faultsTab: "list",
      setFaultsTab: (tab) => set({ faultsTab: tab }),

      dashboardModelTab: "hotspots",
      setDashboardModelTab: (tab) => set({ dashboardModelTab: tab }),

      modelsTab: "models",
      setModelsTab: (tab) => set({ modelsTab: tab }),

      workflowsTab: "workflows",
      setWorkflowsTab: (tab) => set({ workflowsTab: tab }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      canvasWorkflowId: null,
      setCanvasWorkflowId: (id) => set({ canvasWorkflowId: id }),
      logViewerData: null,
      setLogViewerData: (data) => set({ logViewerData: data }),

      preferencesOverride: {},
      setPreferenceOverride: (patch) =>
        set((state) => ({
          preferencesOverride: { ...state.preferencesOverride, ...patch },
        })),
      clearPreferenceOverrides: () => set({ preferencesOverride: {}, sidebarCollapsed: false }),
    }),
    {
      name: "ecoctrl-admin-storage",
      partialize: (state) => ({
        activeTab: state.activeTab,
        energyTab: state.energyTab,
        faultsTab: state.faultsTab,
        dashboardModelTab: state.dashboardModelTab,
        modelsTab: state.modelsTab,
        workflowsTab: state.workflowsTab,
        sidebarCollapsed: state.sidebarCollapsed,
        preferencesOverride: state.preferencesOverride,
      }),
    },
  ),
);
