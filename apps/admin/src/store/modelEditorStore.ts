// ========================================
// Model Editor State Store
// ========================================

import { create } from "zustand";
import { toast } from "sonner";
import type { DashboardModelConfig, DashboardModelLabel, ModelFileEntry } from "@ecoctrl/shared";
import type { LabelConfig, LabelOperation } from "@/components/babylon-editor";
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

  // UI toggles
  editorMode: EditorMode;
  showGrid: boolean;
  showAxes: boolean;
  filesExpanded: boolean;
  labelsExpanded: boolean;
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
  updateLabelConfig: (config: LabelConfig) => void;
  updateLabelOperations: (operations: LabelOperation[]) => void;

  // Actions — UI
  setEditorMode: (mode: EditorMode) => void;
  toggleGrid: () => void;
  toggleAxes: () => void;
  toggleFilesExpanded: () => void;
  toggleLabelsExpanded: () => void;
  togglePanel: () => void;
}

export const useModelEditorStore = create<ModelEditorState>((set, get) => ({
  // Initial state
  config: null,
  loading: true,
  saving: false,
  labels: [],
  selectedLabelId: null,
  editorMode: "select",
  showGrid: true,
  showAxes: true,
  filesExpanded: true,
  labelsExpanded: true,
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
    const { labels } = get();
    set({ saving: true });
    try {
      await dashboardModelApi.update({ labels });
      toast.success("配置已保存");
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
    const { config } = get();
    if (!config) return;
    const deleted = config.modelFiles?.find((f) => f.id === id);
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
      toast.error("上传失败");
    } finally {
      set({ uploading: false });
    }
  },

  // Labels — pick from 3D scene
  pickLabel: (position) => {
    const { editorMode, labels } = get();
    if (editorMode !== "placeLabel") return;

    const newLabel: Label = {
      id: `label_${Date.now()}`,
      key: `label_${labels.length + 1}`,
      name: `标签 ${labels.length + 1}`,
      description: "",
      parentId: null,
      position: {
        x: parseFloat(position.x.toFixed(3)),
        y: parseFloat(position.y.toFixed(3)),
        z: parseFloat(position.z.toFixed(3)),
      },
      meshKeywords: [],
      operations: [],
      order: labels.length,
    };

    set({
      labels: [...labels, newLabel],
      selectedLabelId: newLabel.id,
      editorMode: "select",
    });
    toast.success("标签已添加");
  },

  selectLabel: (id) => set({ selectedLabelId: id, editorMode: id ? "select" : get().editorMode }),

  addLabel: (parentId) => {
    const { labels } = get();
    const newLabel: Label = {
      id: `label_${Date.now()}`,
      key: `label_${labels.length + 1}`,
      name: `标签 ${labels.length + 1}`,
      description: "",
      parentId: parentId ?? null,
      position: { x: 0, y: 1, z: 0 },
      meshKeywords: [],
      operations: [],
      order: labels.length,
    };
    set({ labels: [...labels, newLabel], selectedLabelId: newLabel.id });
  },

  deleteLabel: (id) => {
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== id),
      selectedLabelId: state.selectedLabelId === id ? null : state.selectedLabelId,
    }));
    toast.success("标签已删除");
  },

  updateLabelConfig: (config) =>
    set((state) => ({
      labels: state.labels.map((l) =>
        l.id === config.id
          ? {
              ...l,
              key: config.key,
              name: config.name,
              description: config.description,
              parentId: config.parentId,
              position: config.position,
              meshKeywords: config.meshKeywords,
            }
          : l,
      ),
    })),

  updateLabelOperations: (operations) =>
    set((state) => {
      const { selectedLabelId } = state;
      if (!selectedLabelId) return state;
      return {
        labels: state.labels.map((l) => (l.id === selectedLabelId ? { ...l, operations } : l)),
      };
    }),

  // UI toggles
  setEditorMode: (mode) => set({ editorMode: mode }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
  toggleFilesExpanded: () => set((state) => ({ filesExpanded: !state.filesExpanded })),
  toggleLabelsExpanded: () => set((state) => ({ labelsExpanded: !state.labelsExpanded })),
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));

// ========================================
// Selectors (derived state)
// ========================================

export const selectExistingFiles = (state: ModelEditorState): ModelFileEntry[] => {
  const config = state.config;
  return config?.modelFiles?.length
    ? config.modelFiles
    : config?.modelFileUrl
      ? [
          {
            id: "legacy",
            fileKey: config.modelFileUrl,
            name: config.modelFileUrl.split("/").pop() || "legacy",
            priority: "critical",
          },
        ]
      : [];
};

export const selectSelectedLabel = (state: ModelEditorState) =>
  state.labels.find((l) => l.id === state.selectedLabelId) ?? null;
