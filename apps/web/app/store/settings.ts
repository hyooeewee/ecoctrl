import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  fetchDashboardSettings,
  fetchUserSettings,
  patchDashboardSettings,
  patchUserSettings,
} from "~/lib/dashboard-api";

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

// Default grid position for each known widget (id → {x, y, w, h}).
// Fallback to auto-placement if a widget id is not listed here.
export const defaultWidgetLayouts: Record<string, Omit<BentoLayoutItem, "id" | "hidden">> = {};

// ─── Fields synced to the backend ─────────────────────────────────────────────
// Expand this list as new settings need server-side persistence.
const SYNCABLE_FIELDS: (keyof SettingsState)[] = [
  "language",
  "reducedMotion",
  "autoRotate",
  "rotateSpeed",
  "showLabels",
  "glowIntensity",
  "environmentPreset",
  "defaultCameraRadius",
  "defaultRotationY",
  "dataRefreshInterval",
  "navHideDelay",
  "editAutoExitDelay",
  "showLoadingAnimation",
  "bentoLayout",
];

// ─── Store state ──────────────────────────────────────────────────────────────

export interface SettingsState {
  autoRotate: boolean;
  rotateSpeed: number;
  showLabels: boolean;
  glowIntensity: number;
  environmentPreset: string;
  dataRefreshInterval: number;
  navHideDelay: number;
  defaultCameraRadius: number;
  defaultRotationY: number;
  language: "zh-CN" | "en-US";
  reducedMotion: boolean;
  bentoLayout: BentoLayoutItem[];
  bentoDragEnabled: boolean;
  editAutoExitDelay: number; // ms; 0 = disabled
  showLoadingAnimation: boolean;

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
  setEnvironmentPreset: (value: string) => void;
  setDataRefreshInterval: (value: number) => void;
  setNavHideDelay: (value: number) => void;
  setDefaultCameraRadius: (value: number) => void;
  setDefaultRotationY: (value: number) => void;
  setLanguage: (value: SettingsState["language"]) => void;
  setReducedMotion: (value: boolean) => void;
  setBentoDragEnabled: (value: boolean) => void;
  setEditAutoExitDelay: (value: number) => void;
  setShowLoadingAnimation: (value: boolean) => void;
  setBentoItemHidden: (id: string, hidden: boolean) => void;
  resizeBentoItem: (id: string, w: number, h: number) => void;
  swapBentoItems: (idA: string, idB: string) => void;
  moveBentoItem: (id: string, x: number, y: number) => void;
  setBentoLayout: (layout: BentoLayoutItem[]) => void;
  hydrateBentoLayout: (layout: BentoLayoutItem[]) => void;
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
  environmentPreset: "studio",
  dataRefreshInterval: 30,
  navHideDelay: 1500,
  defaultCameraRadius: 25,
  defaultRotationY: 0,
  language: "zh-CN",
  reducedMotion: false,
  bentoLayout: defaultBentoLayout,
  bentoDragEnabled: false,
  editAutoExitDelay: 30000,
  showLoadingAnimation: true,
  syncStatus: "idle",
  hasUnsavedChanges: false,
  syncDebounceMs: 500,
};

// Module-level debounce timer for auto-sync.
let syncTimer: ReturnType<typeof setTimeout> | null = null;
// Tracks the last user whose settings were loaded; re-fetch on user switch.
// `undefined` means "never loaded", distinct from `null` (guest / not logged in).
let lastLoadedUserId: string | null | undefined = undefined;

// Read current user id from persisted auth store (no import to avoid cycles).
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("ecoctrl-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.user?.id || null;
  } catch {
    return null;
  }
}

// Custom storage that isolates settings per user in localStorage.
const userAwareStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    const userId = getCurrentUserId();
    const key = userId ? `${name}--${userId}` : name;
    return localStorage.getItem(key);
  },
  setItem: (name: string, value: string) => {
    const userId = getCurrentUserId();
    const key = userId ? `${name}--${userId}` : name;
    localStorage.setItem(key, value);
  },
  removeItem: (name: string) => {
    const userId = getCurrentUserId();
    const key = userId ? `${name}--${userId}` : name;
    localStorage.removeItem(key);
  },
}));

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

// Global event to trigger settings rehydration when user switches.
const SETTINGS_REHYDRATE_EVENT = "ecoctrl:rehydrate-settings";

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
      setEnvironmentPreset: (value) => {
        set({ environmentPreset: value, hasUnsavedChanges: true, syncStatus: "idle" });
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
      setShowLoadingAnimation: (value) => {
        set({ showLoadingAnimation: value, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },

      // bentoDragEnabled is transient UI state — NOT synced.
      setBentoDragEnabled: (value) => set({ bentoDragEnabled: value }),

      // ─── Bento layout setters (auto-sync) ─────────────────────────────────
      setBentoItemHidden: (id, hidden) => {
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) =>
            item.id === id ? { ...item, hidden } : item,
          ),
          hasUnsavedChanges: true,
          syncStatus: "idle",
        }));
        scheduleSync(get);
      },
      resizeBentoItem: (id, w, h) => {
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) => (item.id === id ? { ...item, w, h } : item)),
          hasUnsavedChanges: true,
          syncStatus: "idle",
        }));
        scheduleSync(get);
      },
      swapBentoItems: (idA, idB) => {
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
        });
        scheduleSync(get);
      },
      moveBentoItem: (id, x, y) => {
        set((state) => ({
          bentoLayout: state.bentoLayout.map((item) => (item.id === id ? { ...item, x, y } : item)),
          hasUnsavedChanges: true,
          syncStatus: "idle",
        }));
        scheduleSync(get);
      },
      setBentoLayout: (layout) => {
        set({ bentoLayout: layout, hasUnsavedChanges: true, syncStatus: "idle" });
        scheduleSync(get);
      },
      // Hydrate layout from server without marking unsaved (used on initial load).
      hydrateBentoLayout: (layout) => {
        set({ bentoLayout: layout });
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
        const currentUserId = getCurrentUserId();
        if (lastLoadedUserId === currentUserId) return;
        lastLoadedUserId = currentUserId;

        const state = get();

        // Authenticated users: try user-specific endpoint first.
        if (currentUserId) {
          const userRes = await fetchUserSettings();
          if (userRes.ok && userRes.data) {
            if (state.hasUnsavedChanges) return;
            const remote = userRes.data as Record<string, unknown>;
            const updates: Record<string, unknown> = {};
            for (const key of SYNCABLE_FIELDS) {
              if (key in remote && remote[key] !== undefined) {
                updates[key] = remote[key];
              }
            }
            set(updates);
            return;
          }
          // If user endpoint fails (e.g. not yet implemented), fall through to public.
        }

        const res = await fetchDashboardSettings();
        if (res.ok && res.data) {
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

        // Authenticated users: save to user-specific endpoint.
        if (getCurrentUserId()) {
          const userRes = await patchUserSettings(payload);
          if (userRes.ok) {
            set({ syncStatus: "saved", hasUnsavedChanges: false });
            return;
          }
          // Fall through to public endpoint if user endpoint fails.
        }

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
      storage: userAwareStorage,
      // Exclude transient sync state from localStorage.
      partialize: (state) => {
        const { syncStatus: _, hasUnsavedChanges: __, ...persisted } = state;
        return persisted;
      },
    },
  ),
);

// Rehydrate settings when user logs in/out so the correct per-user localStorage key is read.
if (typeof window !== "undefined") {
  window.addEventListener(SETTINGS_REHYDRATE_EVENT, () => {
    lastLoadedUserId = null;
    void (
      useSettingsStore as unknown as { persist: { rehydrate: () => Promise<void> } }
    ).persist.rehydrate();
  });
}
