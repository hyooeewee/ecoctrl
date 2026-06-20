// ========================================
// Model Editor State Store
// ========================================

import { create } from "zustand";
import { toast } from "sonner";
import type { DashboardModelConfig, DashboardModelLabel, LabelAction } from "@ecoctrl/shared";
import { dashboardModelApi } from "@/api/dashboardModel";
import { clearModelCache } from "@ecoctrl/shared/model-cache";
import { Vector3 } from "@babylonjs/core";

type Label = DashboardModelLabel;
type EditorMode = "select" | "placeLabel" | "clipPreview";

interface ModelEditorState {
  // Server data
  config: DashboardModelConfig | null;
  loading: boolean;
  saving: boolean;

  // Labels
  labels: Label[];
  selectedLabelId: string | null;
  placingLabelId: string | null;

  // Auto-save
  isDirty: boolean;

  // UI toggles
  editorMode: EditorMode;
  showGrid: boolean;
  showAxes: boolean;
  panelOpen: boolean;

  // Model visibility & progress
  visibleFileIds: Set<string>;
  loadingProgress: Map<string, number>;

  // Upload queue
  pendingFiles: File[];
  uploading: boolean;

  // Actions — data
  fetchConfig: () => Promise<void>;
  saveLabels: () => Promise<void>;

  // Actions — model files
  toggleFileVisible: (id: string) => void;
  deleteFile: (id: string) => Promise<void>;
  updateFilePriority: (id: string, priority: "critical" | "background") => Promise<void>;
  updateFileRole: (id: string, role: string) => Promise<void>;
  reorderFiles: (fromIndex: number, toIndex: number) => Promise<void>;
  setModelProgress: (id: string, progress: number) => void;

  // Actions — upload
  addPendingFiles: (files: File[]) => void;
  removePendingFile: (index: number) => void;
  clearPendingFiles: () => void;
  uploadAll: () => Promise<void>;

  // Actions — labels
  pickLabel: (position: Vector3) => void;
  selectLabel: (id: string | null) => void;
  addLabel: (parentId?: string) => void;
  deleteLabel: (id: string) => void;
  updateLabelConfig: (label: Label) => void;
  updateLabelPosition: (id: string, position: { x: number; y: number; z: number }) => void;
  updateLabelActions: (actions: LabelAction[]) => void;
  startPlacingLabel: (id: string) => void;
  stopPlacingLabel: () => void;
  markDirty: () => void;

  // Actions — UI
  setEditorMode: (mode: EditorMode) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  togglePanel: () => void;
}

export const useModelEditorStore = create<ModelEditorState>((set, get) => ({
  // Initial state
  config: null,
  loading: true,
  saving: false,
  labels: [],
  selectedLabelId: null,
  placingLabelId: null,
  isDirty: false,
  editorMode: "select",
  showGrid: true,
  showAxes: true,
  panelOpen: true,
  visibleFileIds: new Set(),
  loadingProgress: new Map(),
  pendingFiles: [],
  uploading: false,

  // Data loading
  fetchConfig: async () => {
    try {
      const data = await dashboardModelApi.get();
      set({
        config: data,
        visibleFileIds: data.modelFiles?.length
          ? new Set(data.modelFiles.map((f) => f.id))
          : new Set(),
        labels: data.labels ? (data.labels as Label[]) : [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },

  // Save
  saveLabels: async () => {
    const { labels, isDirty } = get();
    if (!isDirty) return;
    set({ saving: true });
    try {
      await dashboardModelApi.update({ labels });
      set({ isDirty: false });
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("保存失败");
    } finally {
      set({ saving: false });
    }
  },

  // Model file visibility
  toggleFileVisible: (id) =>
    set((state) => {
      const next = new Set(state.visibleFileIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { visibleFileIds: next };
    }),

  deleteFile: async (id) => {
    const { config, labels } = get();
    if (!config) return;
    const deleted = config.modelFiles?.find((f) => f.id === id);
    const deletedRole = deleted?.role;

    // Check if any labels bind to the deleted model's role.
    if (deletedRole) {
      const boundLabels = labels.filter((l) => l.modelBindings.includes(deletedRole));
      if (boundLabels.length > 0) {
        toast.warning(
          `该模型有 ${boundLabels.length} 个标签绑定到角色 "${deletedRole}"，删除后这些标签将变为全局标签`,
        );
      }
    }

    const newFiles = config.modelFiles?.filter((f) => f.id !== id) ?? [];
    try {
      await dashboardModelApi.update({ modelFiles: newFiles });
      if (deleted) {
        const url = `/api/dashboard-model/file?key=${encodeURIComponent(deleted.fileKey)}`;
        await clearModelCache(url);
      }
      set((state) => ({
        config: state.config ? { ...state.config, modelFiles: newFiles } : null,
        visibleFileIds: (() => {
          const next = new Set(state.visibleFileIds);
          next.delete(id);
          return next;
        })(),
        loadingProgress: (() => {
          const next = new Map(state.loadingProgress);
          next.delete(id);
          return next;
        })(),
      }));
      toast.success("模型文件已删除");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("删除失败");
    }
  },

  updateFilePriority: async (id, priority) => {
    const { config } = get();
    if (!config) return;
    const newFiles = config.modelFiles?.map((f) => (f.id === id ? { ...f, priority } : f)) ?? [];
    try {
      await dashboardModelApi.update({ modelFiles: newFiles });
      set((state) => ({
        config: state.config ? { ...state.config, modelFiles: newFiles } : null,
      }));
      toast.success("优先级已更新");
    } catch (err) {
      console.error("Priority update failed:", err);
      toast.error("更新失败");
    }
  },

  updateFileRole: async (id: string, role: string) => {
    const { config } = get();
    if (!config) return;
    const newFiles =
      config.modelFiles?.map((f) => (f.id === id ? { ...f, role: role || undefined } : f)) ?? [];
    try {
      await dashboardModelApi.update({ modelFiles: newFiles });
      set((state) => ({
        config: state.config ? { ...state.config, modelFiles: newFiles } : null,
      }));
    } catch (err) {
      console.error("Role update failed:", err);
      toast.error("更新失败");
    }
  },

  reorderFiles: async (fromIndex, toIndex) => {
    const { config } = get();
    if (!config) return;
    const files = config.modelFiles ? [...config.modelFiles] : [];
    if (fromIndex < 0 || fromIndex >= files.length) return;
    if (toIndex < 0 || toIndex >= files.length) return;

    const [moved] = files.splice(fromIndex, 1);
    files.splice(toIndex, 0, moved);
    const reordered = files.map((f, i) => ({ ...f, order: i }));

    try {
      await dashboardModelApi.update({ modelFiles: reordered });
      set((state) => ({
        config: state.config ? { ...state.config, modelFiles: reordered } : null,
      }));
    } catch (err) {
      console.error("Reorder failed:", err);
      toast.error("排序失败");
    }
  },

  setModelProgress: (id, progress) =>
    set((state) => {
      const next = new Map(state.loadingProgress);
      next.set(id, progress);
      return { loadingProgress: next };
    }),

  // Upload queue
  addPendingFiles: (files) => set((state) => ({ pendingFiles: [...state.pendingFiles, ...files] })),

  removePendingFile: (index) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.filter((_, i) => i !== index),
    })),

  clearPendingFiles: () => set({ pendingFiles: [] }),

  uploadAll: async () => {
    const { pendingFiles } = get();
    if (pendingFiles.length === 0) return;
    set({ uploading: true });
    try {
      const updated = await dashboardModelApi.uploadMultiple(pendingFiles);
      set({ config: updated, pendingFiles: [] });
      toast.success(`已上传 ${pendingFiles.length} 个文件`);
    } catch (err) {
      console.error("Upload failed:", err);
      const message = err instanceof Error ? err.message : "上传失败";
      toast.error(message);
    } finally {
      set({ uploading: false });
    }
  },

  // Labels — pick from 3D scene
  pickLabel: (position) => {
    const { editorMode, labels, placingLabelId } = get();
    if (editorMode !== "placeLabel") return;

    const rounded = {
      x: parseFloat(position.x.toFixed(3)),
      y: parseFloat(position.y.toFixed(3)),
      z: parseFloat(position.z.toFixed(3)),
    };

    if (placingLabelId) {
      set({
        labels: labels.map((l) =>
          l.meta.id === placingLabelId ? { ...l, anchor: { ...l.anchor, position: rounded } } : l,
        ),
        placingLabelId: null,
        editorMode: "placeLabel",
        isDirty: true,
      });
      toast.success("位置已更新");
      return;
    }

    const id = `label_${Date.now()}`;
    const newLabel: Label = {
      meta: { id, name: `标签 ${labels.length + 1}` },
      anchor: { position: rounded, meshKeywords: [] },
      tree: { parentId: null, order: labels.length },
      groups: [],
      actions: [],
      modelBindings: [],
    };

    set({
      labels: [...labels, newLabel],
      selectedLabelId: id,
      editorMode: "select",
      isDirty: true,
    });
    toast.success("标签已添加");
  },

  startPlacingLabel: (id) => set({ placingLabelId: id, editorMode: "placeLabel" }),
  stopPlacingLabel: () => set({ placingLabelId: null, editorMode: "select" }),

  markDirty: () => set({ isDirty: true }),

  selectLabel: (id) => set({ selectedLabelId: id }),

  addLabel: (parentId) => {
    const { labels } = get();
    const id = `label_${Date.now()}`;
    const newLabel: Label = {
      meta: { id, name: `标签 ${labels.length + 1}` },
      anchor: { position: { x: 0, y: 1, z: 0 }, meshKeywords: [] },
      tree: { parentId: parentId ?? null, order: labels.length },
      groups: [],
      actions: [],
      modelBindings: [],
    };
    set({ labels: [...labels, newLabel], selectedLabelId: id, isDirty: true });
  },

  deleteLabel: (id) => {
    set((state) => ({
      labels: state.labels.filter((l) => l.meta.id !== id),
      selectedLabelId: state.selectedLabelId === id ? null : state.selectedLabelId,
      isDirty: true,
    }));
    toast.success("标签已删除");
  },

  updateLabelConfig: (label) =>
    set((state) => ({
      labels: state.labels.map((l) => (l.meta.id === label.meta.id ? label : l)),
      isDirty: true,
    })),

  updateLabelPosition: (id, position) =>
    set((state) => ({
      labels: state.labels.map((l) =>
        l.meta.id === id
          ? {
              ...l,
              anchor: {
                ...l.anchor,
                position: {
                  x: parseFloat(position.x.toFixed(3)),
                  y: parseFloat(position.y.toFixed(3)),
                  z: parseFloat(position.z.toFixed(3)),
                },
              },
            }
          : l,
      ),
      isDirty: true,
    })),

  updateLabelActions: (actions) =>
    set((state) => {
      const { selectedLabelId } = state;
      if (!selectedLabelId) return state;
      return {
        labels: state.labels.map((l) => (l.meta.id === selectedLabelId ? { ...l, actions } : l)),
        isDirty: true,
      };
    }),

  // UI toggles
  setEditorMode: (mode) => set({ editorMode: mode }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));
