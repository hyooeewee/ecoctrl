import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SettingsState {
  autoRotate: boolean;
  rotateSpeed: number;
  showLabels: boolean;
  glowIntensity: number;
  dataRefreshInterval: number;
  navHideDelay: number;
  language: "zh-CN" | "en-US";
  reducedMotion: boolean;
}

interface SettingsStore extends SettingsState {
  setAutoRotate: (value: boolean) => void;
  setRotateSpeed: (value: number) => void;
  setShowLabels: (value: boolean) => void;
  setGlowIntensity: (value: number) => void;
  setDataRefreshInterval: (value: number) => void;
  setNavHideDelay: (value: number) => void;
  setLanguage: (value: SettingsState["language"]) => void;
  setReducedMotion: (value: boolean) => void;
  reset: () => void;
}

const defaults: SettingsState = {
  autoRotate: true,
  rotateSpeed: 0.5,
  showLabels: true,
  glowIntensity: 0.4,
  dataRefreshInterval: 30,
  navHideDelay: 1500,
  language: "zh-CN",
  reducedMotion: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      setAutoRotate: (value) => set({ autoRotate: value }),
      setRotateSpeed: (value) => set({ rotateSpeed: value }),
      setShowLabels: (value) => set({ showLabels: value }),
      setGlowIntensity: (value) => set({ glowIntensity: value }),
      setDataRefreshInterval: (value) => set({ dataRefreshInterval: value }),
      setNavHideDelay: (value) => set({ navHideDelay: value }),
      setLanguage: (value) => set({ language: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
      reset: () => set(defaults),
    }),
    {
      name: "ecoctrl-settings",
    },
  ),
);
