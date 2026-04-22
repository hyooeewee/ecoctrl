import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchDashboardSettings, patchDashboardSettings } from "~/lib/dashboard-api";

// ─── Bento layout types ───────────────────────────────────────────────────────

export interface BentoLayoutItem {
  id: string;
  x: number; // 1-based column start
  y: number; // 1-based row start
  w: number;
  h: number;
  hidden: boolean;
}

export const defaultBentoLayout: BentoLayoutItem[] = [];

// ─── Fields synced to the backend ─────────────────────────────────────────────
// Expand this list as new settings need server-side persistence.
const SYNCABLE_FIELDS: (keyof SettingsState)[] = [
  "language",
  "reducedMotion",
  "autoRotate",
  "rotateSpeed",
  "showLabels",
  "glowIntensity",
  "defaultCameraRadius",
  "defaultRotationY",
  "dataRefreshInterval",
  "navHideDelay",
  "editAutoExitDelay",
  "bentoLayout",
];

// ─── Store state ──────────────────────────────────────────────────────────────

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

  // --- Sync status (not persisted to localStorage) ---
  syncStatus: "idle" | "syncing" | "saved" | "error";
  hasUnsavedChanges: boolean;
  syncDebounceMs: number;
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

  // --- Sync actions ---
  loadSettings: () => Promise<void>;
  syncSettings: () => Promise<void>;
  flushSync: () => void;
  setSyncDebounceMs: (value: number) => void;
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
  syncStatus: "idle",
  hasUnsavedChanges: false,
  syncDebounceMs: 500,
};

// Module-level debounce timer for auto-sync.
let syncTimer: ReturnType<typeof setTimeout> | null = null;
// Tracks whether we have already fetched server settings this session.
let settingsLoadedOnce = false;

function scheduleSync(getState: () => SettingsStore) {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  const { syncDebounceMs } = getState();
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const state = getState();
    if (state.hasUnsavedChanges && state.syncStatus !== "syncing") {
      state.syncSettings();
    }
  }, syncDebounceMs);
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaults,

      // ─── Simple field setters (auto-sync) ─────────────────────────────────
      setAutoRotate: (value) => {
        set({ autoRotate: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setRotateSpeed: (value) => {
        set({ rotateSpeed: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setShowLabels: (value) => {
        set({ showLabels: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setGlowIntensity: (value) => {
        set({ glowIntensity: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setDataRefreshInterval: (value) => {
        set({ dataRefreshInterval: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setNavHideDelay: (value) => {
        set({ navHideDelay: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setDefaultCameraRadius: (value) => {
        set({ defaultCameraRadius: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setDefaultRotationY: (value) => {
        set({ defaultRotationY: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setLanguage: (value) => {
        set({ language: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setReducedMotion: (value) => {
        set({ reducedMotion: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      setEditAutoExitDelay: (value) => {
        set({ editAutoExitDelay: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },

      // bentoDragEnabled is transient UI state — NOT synced.
      setBentoDragEnabled: (value) => set({ bentoDragEnabled: value }),

      // ─── Bento layout setters (auto-sync) ─────────────────────────────────
      setBentoItemHidden: (id, hidden) =>
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) =>
            item.id === id ? { ...item, hidden } : item,
          ),
          hasUnsavedChanges: true,
          syncStatus: "idle",
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
          return { bentoLayout: next, hasUnsavedChanges: true, syncStatus: "idle" };
        }),
      moveBentoItem: (id, x, y) =>
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) => (item.id === id ? { ...item, x, y } : item)),
          hasUnsavedChanges: true,
          syncStatus: "idle",
        })),
      setBentoLayout: (layout) => {
        set({ bentoLayout: layout, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      resetBentoLayout: () => {
        set({ bentoLayout: defaultBentoLayout, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },

      // ─── Reset (auto-sync) ────────────────────────────────────────────────
      reset: () => {
        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }
        set({ ...defaults, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },

      // ─── Server sync ────────────────────────────────────────────────────────
      loadSettings: async () => {
        if (settingsLoadedOnce) return;
        settingsLoadedOnce = true;

        const state = get();
        const res = await fetchDashboardSettings();

        if (res.ok && res.data) {
          // If there are unsaved local changes, don't overwrite them.
          if (state.hasUnsavedChanges) return;

          const remote = res.data as Record<string, unknown>;
          const updates: Record<string, unknown> = {};
          for (const key of SYNCABLE_FIELDS) {
            if (key in remote && remote[key] !== undefined) {
              updates[key] = remote[key];
            }
          }
          set(updates);
        }
      },

      syncSettings: async () => {
        const state = get();
        const payload: Record<string, unknown> = {};
        for (const key of SYNCABLE_FIELDS) {
          payload[key] = state[key];
        }

        set({ syncStatus: "syncing" });
        const res = await patchDashboardSettings(payload);

        if (res.ok) {
          set({ syncStatus: "saved", hasUnsavedChanges: false });
        } else {
          set({ syncStatus: "error" });
        }
      },

      flushSync: () => {
        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }
        const state = get();
        if (state.hasUnsavedChanges && state.syncStatus !== "syncing") {
          state.syncSettings();
        }
      },

      setSyncDebounceMs: (value) => set({ syncDebounceMs: value }),
    }),
    {
      name: "ecoctrl-settings",
      // Exclude transient sync state from localStorage.
      partialize: (state) => {
        const { syncStatus: _, hasUnsavedChanges: __, ...persisted } = state;
        return persisted;
      },
    },
  ),
);
