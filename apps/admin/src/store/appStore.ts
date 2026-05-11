import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  workflowTab: string;
  setWorkflowTab: (tab: string) => void;
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

      workflowTab: "list",
      setWorkflowTab: (tab) => set({ workflowTab: tab }),
    }),
    {
      name: "ecoctrl-admin-storage",
    },
  ),
);
