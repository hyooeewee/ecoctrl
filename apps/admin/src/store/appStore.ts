import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserPreferences } from "@ecoctrl/shared";

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

      preferencesOverride: {},
      setPreferenceOverride: (patch) =>
        set((state) => ({
          preferencesOverride: { ...state.preferencesOverride, ...patch },
        })),
      clearPreferenceOverrides: () => set({ preferencesOverride: {} }),
    }),
    {
      name: "ecoctrl-admin-storage",
      partialize: (state) => ({
        activeTab: state.activeTab,
        energyTab: state.energyTab,
        faultsTab: state.faultsTab,
        dashboardModelTab: state.dashboardModelTab,
        modelsTab: state.modelsTab,
        preferencesOverride: state.preferencesOverride,
      }),
    },
  ),
);
