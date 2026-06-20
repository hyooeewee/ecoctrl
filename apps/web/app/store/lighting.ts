import { create } from "zustand";

// ========================================
// Types
// ========================================

export type LightingStatus = "off" | "half" | "on";

export interface LightingGroupState {
  id: string;
  name: string;
  status: LightingStatus;
}

interface LightingState {
  /** labelId → group states */
  entries: Record<string, LightingGroupState[]>;
  /** Mutation counter — bump to force React re-render */
  version: number;
  /** Replace all groups for a label (initial load) */
  initGroups: (labelId: string, groups: LightingGroupState[]) => void;
  /** Merge partial group update (from SSE) */
  mergeGroups: (labelId: string, groups: LightingGroupState[]) => void;
  /** Update a single group status (optimistic) */
  updateGroup: (labelId: string, groupId: string, status: LightingStatus) => void;
  /** Clear all entries */
  clear: () => void;
}

// ========================================
// Store
// ========================================

export const useLightingStore = create<LightingState>((set) => ({
  entries: {},
  version: 0,

  initGroups: (labelId, groups) =>
    set((state) => ({
      entries: { ...state.entries, [labelId]: groups },
      version: state.version + 1,
    })),

  mergeGroups: (labelId, groups) =>
    set((state) => {
      const existing = state.entries[labelId] ?? [];
      const merged = existing.map((g) => {
        const update = groups.find((u) => u.id === g.id);
        return update ?? g;
      });
      const newGroups = groups.filter((g) => !existing.some((e) => e.id === g.id));
      return {
        entries: { ...state.entries, [labelId]: [...merged, ...newGroups] },
        version: state.version + 1,
      };
    }),

  updateGroup: (labelId, groupId, status) =>
    set((state) => {
      const groups = state.entries[labelId];
      if (!groups) return state;
      return {
        entries: {
          ...state.entries,
          [labelId]: groups.map((g) => (g.id === groupId ? { ...g, status } : g)),
        },
        version: state.version + 1,
      };
    }),

  clear: () => set({ entries: {}, version: 0 }),
}));
