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
  /** Set all group statuses for a label (from API or SSE) */
  setStatus: (labelId: string, groups: LightingGroupState[]) => void;
  /** Update a single group status (optimistic or SSE) */
  updateGroup: (labelId: string, groupId: string, status: LightingStatus) => void;
  /** Clear all entries */
  clear: () => void;
}

// ========================================
// Store
// ========================================

export const useLightingStore = create<LightingState>((set) => ({
  entries: {},

  setStatus: (labelId, groups) =>
    set((state) => ({
      entries: { ...state.entries, [labelId]: groups },
    })),

  updateGroup: (labelId, groupId, status) =>
    set((state) => {
      const groups = state.entries[labelId];
      if (!groups) return state;
      return {
        entries: {
          ...state.entries,
          [labelId]: groups.map((g) => (g.id === groupId ? { ...g, status } : g)),
        },
      };
    }),

  clear: () => set({ entries: {} }),
}));
