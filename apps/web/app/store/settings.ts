import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Bento layout types ───────────────────────────────────────────────────────

export interface BentoLayoutItem {
  id: string;
  x: number; // 1-based column start
  y: number; // 1-based row start
  w: number;
  h: number;
  hidden: boolean;
}

import { buildDefaultBentoLayout } from "~/components/dashboard/widgets/registry";

export const defaultBentoLayout: BentoLayoutItem[] = buildDefaultBentoLayout();

// ─── Store ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  autoRotate: boolean;
  rotateSpeed: number;
  showLabels: boolean;
  glowIntensity: number;
  dataRefreshInterval: number;
  navHideDelay: number;
  defaultCameraRadius: number;
  defaultRotationY: number;
  language: "zh-CN" | "en-US";
  reducedMotion: boolean;
  bentoLayout: BentoLayoutItem[];
  bentoDragEnabled: boolean;
  editAutoExitDelay: number; // ms; 0 = disabled
}

interface SettingsStore extends SettingsState {
  setAutoRotate: (value: boolean) => void;
  setRotateSpeed: (value: number) => void;
  setShowLabels: (value: boolean) => void;
  setGlowIntensity: (value: number) => void;
  setDataRefreshInterval: (value: number) => void;
  setNavHideDelay: (value: number) => void;
  setDefaultCameraRadius: (value: number) => void;
  setDefaultRotationY: (value: number) => void;
  setLanguage: (value: SettingsState["language"]) => void;
  setReducedMotion: (value: boolean) => void;
  setBentoDragEnabled: (value: boolean) => void;
  setEditAutoExitDelay: (value: number) => void;
  setBentoItemHidden: (id: string, hidden: boolean) => void;
  swapBentoItems: (idA: string, idB: string) => void;
  moveBentoItem: (id: string, x: number, y: number) => void;
  setBentoLayout: (layout: BentoLayoutItem[]) => void;
  resetBentoLayout: () => void;
  reset: () => void;
}

const defaults: SettingsState = {
  autoRotate: true,
  rotateSpeed: 0.5,
  showLabels: true,
  glowIntensity: 0.4,
  dataRefreshInterval: 30,
  navHideDelay: 1500,
  defaultCameraRadius: 25,
  defaultRotationY: 0,
  language: "zh-CN",
  reducedMotion: false,
  bentoLayout: defaultBentoLayout,
  bentoDragEnabled: false,
  editAutoExitDelay: 30000,
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
      setDefaultCameraRadius: (value) => set({ defaultCameraRadius: value }),
      setDefaultRotationY: (value) => set({ defaultRotationY: value }),
      setLanguage: (value) => set({ language: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
      setBentoDragEnabled: (value) => set({ bentoDragEnabled: value }),
      setEditAutoExitDelay: (value) => set({ editAutoExitDelay: value }),
      setBentoItemHidden: (id, hidden) =>
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) =>
            item.id === id ? { ...item, hidden } : item,
          ),
        })),
      swapBentoItems: (idA, idB) =>
        set((state) => {
          const idxA = state.bentoLayout.findIndex((i) => i.id === idA);
          const idxB = state.bentoLayout.findIndex((i) => i.id === idB);
          if (idxA === -1 || idxB === -1) return state;
          const a = state.bentoLayout[idxA];
          const b = state.bentoLayout[idxB];
          const next = [...state.bentoLayout];
          next[idxA] = { ...a, x: b.x, y: b.y, w: b.w, h: b.h };
          next[idxB] = { ...b, x: a.x, y: a.y, w: a.w, h: a.h };
          return { bentoLayout: next };
        }),
      moveBentoItem: (id, x, y) =>
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) =>
            item.id === id ? { ...item, x, y } : item,
          ),
        })),
      setBentoLayout: (layout) => set({ bentoLayout: layout }),
      resetBentoLayout: () => set({ bentoLayout: defaultBentoLayout }),
      reset: () => set(defaults),
    }),
    {
      name: "ecoctrl-settings",
    },
  ),
);
