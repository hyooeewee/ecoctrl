// ========================================
// Dashboard Model Configuration Page
// ========================================

import React, { useEffect, useRef, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import {
  File,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";
import { ScrollArea } from "@ecoctrl/ui";
import { Tabs, TabsList, TabsTrigger } from "@ecoctrl/ui";
import { FileUpload } from "@ecoctrl/ui/file-upload";

import ModelEditorTopBar from "@/components/model-editor/ModelEditorTopBar";
import ViewportControls from "@/components/model-editor/ViewportControls";
import {
  BabylonScene,
  BabylonSceneRef,
  useMeshPicking,
  useLabelMarkers,
  LabelTree,
  LabelConfigForm,
  ActionStepsConfig,
  type LabelTreeNode,
  type LabelMarkerData,
} from "@/components/babylon-editor";
import { Vector3 } from "@babylonjs/core";
import { useModelEditorStore } from "@/store/modelEditorStore";
import { useAppStore } from "@/store/appStore";
import { pointsApi } from "@/api/points";
import type { Point, ModelFileEntry } from "@ecoctrl/shared";

// ========================================
// Component
// ========================================

export default function DashboardModel() {
  const sceneRef = useRef<BabylonSceneRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAbortRef = useRef<AbortController | null>(null);

  const [previewing, setPreviewing] = useState(false);
  const [availablePoints, setAvailablePoints] = useState<Point[]>([]);

  const setActiveTab = useAppStore((state) => state.setActiveTab);

  // Store state (selective subscriptions)
  const config = useModelEditorStore((s) => s.config);
  const loading = useModelEditorStore((s) => s.loading);
  const saving = useModelEditorStore((s) => s.saving);
  const editorMode = useModelEditorStore((s) => s.editorMode);
  const showGrid = useModelEditorStore((s) => s.showGrid);
  const showAxes = useModelEditorStore((s) => s.showAxes);
  const panelOpen = useModelEditorStore((s) => s.panelOpen);
  const visibleFileIds = useModelEditorStore((s) => s.visibleFileIds);
  const loadingProgress = useModelEditorStore((s) => s.loadingProgress);
  const uploading = useModelEditorStore((s) => s.uploading);
  const labels = useModelEditorStore((s) => s.labels);
  const selectedLabelId = useModelEditorStore((s) => s.selectedLabelId);
  const placingLabelId = useModelEditorStore((s) => s.placingLabelId);
  const isDirty = useModelEditorStore((s) => s.isDirty);

  // Store actions (stable references)
  const {
    fetchConfig,
    saveLabels,
    toggleFileVisible,
    deleteFile,
    updateFilePriority,
    updateFileRole,
    reorderFiles,
    setModelProgress,
    uploadFiles,
    pickLabel,
    selectLabel,
    addLabel,
    deleteLabel,
    updateLabelConfig,
    updateLabelActions,
    updateLabelPosition,
    startPlacingLabel,
    setEditorMode,
    toggleGrid,
    toggleAxes,
    togglePanel,
  } = useModelEditorStore();

  // Derived — computed in component to avoid unstable selectors
  const existingFiles = useMemo(() => {
    if (config?.modelFiles?.length) return config.modelFiles;
    if (config?.modelFileUrl) {
      return [
        {
          id: "legacy",
          fileKey: config.modelFileUrl,
          name: config.modelFileUrl.split("/").pop() || "legacy",
          priority: "critical" as const,
        },
      ];
    }
    return [];
  }, [config]);

  const selectedLabel = useMemo(
    () => labels.find((l) => l.meta.id === selectedLabelId) ?? null,
    [labels, selectedLabelId],
  );

  const modelSources = useMemo(
    () =>
      existingFiles.map((file) => ({
        id: file.id,
        url: `/api/dashboard-model/file?key=${encodeURIComponent(file.fileKey)}`,
        visible: visibleFileIds.has(file.id),
        priority: file.priority ?? "background",
      })),
    [existingFiles, visibleFileIds],
  );

  const labelTreeData: LabelTreeNode[] = useMemo(() => {
    const map = new Map<string, LabelTreeNode>();
    const roots: LabelTreeNode[] = [];

    labels.forEach((l) => {
      map.set(l.meta.id, {
        id: l.meta.id,
        name: l.meta.name,
        children: [],
        actionCount: l.actions.length,
      });
    });

    map.forEach((node, id) => {
      const label = labels.find((l) => l.meta.id === id);
      const parentId = label?.tree.parentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [labels]);

  const labelMarkers: LabelMarkerData[] = useMemo(
    () =>
      labels
        .filter((l) => l.anchor.position !== undefined)
        .map((l) => ({
          id: l.meta.id,
          name: l.meta.name,
          position: new Vector3(l.anchor.position!.x, l.anchor.position!.y, l.anchor.position!.z),
          isSelected: l.meta.id === selectedLabelId,
          hasChildren: labels.some((child) => child.tree.parentId === l.meta.id),
        })),
    [labels, selectedLabelId],
  );

  // Effects
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    let cancelled = false;
    pointsApi
      .list()
      .then((points) => {
        if (!cancelled) setAvailablePoints(points);
      })
      .catch((err) => {
        console.error("[DashboardModel] failed to load points:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useMeshPicking({
    scene: sceneRef.current?.scene ?? null,
    enabled: editorMode === "placeLabel",
    onPick: (info) => pickLabel(info.position),
  });

  useLabelMarkers({
    scene: sceneRef.current?.scene ?? null,
    guiTexture: sceneRef.current?.guiTexture ?? null,
    labels: labelMarkers,
    selectedId: selectedLabelId,
    onLabelClick: (id) => {
      selectLabel(id);
      setEditorMode("placeLabel");
    },
    onLabelDragEnd: (id, position) => {
      updateLabelPosition(id, { x: position.x, y: position.y, z: position.z });
    },
  });

  // Auto-save labels after 1s of inactivity.
  useEffect(() => {
    if (!isDirty || saving) return;
    const timer = setTimeout(() => {
      saveLabels();
    }, 1000);
    return () => clearTimeout(timer);
  }, [isDirty, saving, saveLabels]);

  // Cancel any running preview if the component unmounts.
  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
      previewAbortRef.current = null;
    };
  }, []);

  const handlePreview = async () => {
    if (previewing) {
      previewAbortRef.current?.abort();
      return;
    }
    if (!selectedLabel || selectedLabel.actions.length === 0) return;

    const controller = new AbortController();
    previewAbortRef.current = controller;
    // Force the button to render as "取消执行" immediately so users can cancel
    // even for very fast operation sequences.
    flushSync(() => setPreviewing(true));

    const startTime = performance.now();
    try {
      await sceneRef.current?.executeOperations(selectedLabel.actions, controller.signal);
    } catch (err) {
      if (err instanceof Error && err.message !== "aborted") {
        console.error("[DashboardModel] preview operations failed:", err);
      }
    }

    // Keep the executing state visible for at least 500ms so the state change
    // is not a sub-frame flash.
    const elapsed = performance.now() - startTime;
    const minDuration = 500;
    if (elapsed < minDuration) {
      await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
    }

    setPreviewing(false);
    previewAbortRef.current = null;
  };

  // ========================================
  // Render
  // ========================================

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      <ModelEditorTopBar
        onBack={() => setActiveTab("models")}
        onSave={saveLabels}
        saving={saving}
      />

      <div className="relative flex-1 overflow-hidden">
        {/* Collapsible Left Panel */}
        <AnimatePresence initial={false}>
          {panelOpen && (
            <motion.div
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="bg-card/95 backdrop-blur border-border absolute top-4 left-4 bottom-4 z-10 flex w-80 flex-col overflow-hidden rounded-lg border shadow-lg"
            >
              {/* Panel Header */}
              <div className="border-border flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">模型与标签</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={togglePanel}
                  title="收起"
                >
                  <ChevronLeft size={16} />
                </Button>
              </div>

              {/* Panel Tabs */}
              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as typeof editorMode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="select">模型</TabsTrigger>
                  <TabsTrigger value="placeLabel">标签</TabsTrigger>
                  <TabsTrigger value="clipPreview">动作</TabsTrigger>
                </TabsList>
              </Tabs>

              {placingLabelId && (
                <div className="bg-primary/10 text-primary px-3 py-2 text-xs font-medium">
                  请在场景中点击以设置标签位置
                  <button
                    type="button"
                    className="ml-2 underline hover:text-primary/80"
                    onClick={() => useModelEditorStore.getState().stopPlacingLabel()}
                  >
                    取消
                  </button>
                </div>
              )}

              {/* Panel Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="p-3">
                    {editorMode === "select" && (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {existingFiles.length} 个文件
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <Upload size={14} className="mr-1" />
                            上传
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".glb,.gltf,.obj"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (files.length > 0) uploadFiles(files);
                              e.target.value = "";
                            }}
                          />
                        </div>

                        <>
                          {existingFiles.length > 0 && (
                            <div className="mb-3 space-y-1.5">
                              {existingFiles.map((file, index) => {
                                const fileName =
                                  file.name || file.fileKey.split("/").pop() || "未知";
                                const ext = fileName.split(".").pop()?.toUpperCase() ?? "";
                                const isVisible = visibleFileIds.has(file.id);
                                const progress = loadingProgress.get(file.id);
                                const isLoading = progress !== undefined && progress < 1;
                                return (
                                  <ModelFileRow
                                    key={file.id}
                                    file={file}
                                    fileName={fileName}
                                    ext={ext}
                                    isVisible={isVisible}
                                    isLoading={isLoading}
                                    progress={progress}
                                    index={index}
                                    totalCount={existingFiles.length}
                                    onToggleVisible={() => toggleFileVisible(file.id)}
                                    onRoleChange={(role) => updateFileRole(file.id, role)}
                                    onPriorityChange={(p) => updateFilePriority(file.id, p)}
                                    onDelete={() => deleteFile(file.id)}
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", String(index));
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const from = parseInt(e.dataTransfer.getData("text/plain"));
                                      if (!isNaN(from)) reorderFiles(from, index);
                                    }}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {existingFiles.length === 0 && (
                            <FileUpload
                              accept=".glb,.gltf,.obj"
                              multiple
                              maxFiles={10}
                              label="点击或拖拽文件到此处"
                              disabled={uploading}
                              onUpload={async (files, { onSuccess, onError }) => {
                                try {
                                  await uploadFiles(files);
                                  files.forEach((f) => onSuccess(f));
                                } catch (err) {
                                  files.forEach((f) =>
                                    onError(f, err instanceof Error ? err : new Error("上传失败")),
                                  );
                                }
                              }}
                            />
                          )}
                        </>
                      </div>
                    )}

                    {editorMode === "placeLabel" && (
                      <>
                        <LabelTree
                          labels={labelTreeData}
                          selectedId={selectedLabelId}
                          onSelect={selectLabel}
                          onAdd={addLabel}
                          onDelete={deleteLabel}
                          onEdit={(id) => selectLabel(id)}
                          disabled={existingFiles.length === 0}
                        />

                        {existingFiles.length === 0 && (
                          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground">
                            请先上传模型文件，再创建标签
                          </div>
                        )}

                        {selectedLabel && (
                          <div className="border-t pt-4">
                            <h3 className="mb-3 text-sm font-semibold">标签配置</h3>
                            <div className="max-h-[300px] overflow-auto">
                              <LabelConfigForm
                                label={selectedLabel}
                                parentOptions={labels
                                  .filter((l) => l.meta.id !== selectedLabel.meta.id)
                                  .map((l) => ({ id: l.meta.id, name: l.meta.name }))}
                                availablePoints={availablePoints}
                                availableRoles={existingFiles
                                  .map((f) => f.role)
                                  .filter((r): r is string => !!r)}
                                onChange={updateLabelConfig}
                                onPickPosition={() => startPlacingLabel(selectedLabel.meta.id)}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {editorMode === "clipPreview" && (
                      <div className="grid gap-4">
                        <LabelTree
                          labels={labelTreeData}
                          selectedId={selectedLabelId}
                          onSelect={selectLabel}
                          addTitle="选择标签"
                          disabled
                        />

                        {selectedLabel ? (
                          <>
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">
                                {selectedLabel.meta.name} 的动作
                              </h3>
                              <Button
                                size="sm"
                                variant={previewing ? "secondary" : "outline"}
                                onClick={handlePreview}
                                disabled={!selectedLabel || selectedLabel.actions.length === 0}
                              >
                                {previewing ? "取消执行" : "预览执行"}
                              </Button>
                            </div>
                            <ActionStepsConfig
                              actions={selectedLabel.actions}
                              availableLabels={labels
                                .filter((l) => l.meta.id !== selectedLabelId)
                                .map((l) => ({ id: l.meta.id, name: l.meta.name }))}
                              onChange={updateLabelActions}
                            />
                          </>
                        ) : (
                          <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-6 text-center text-xs text-muted-foreground">
                            选择一个标签来配置动作
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel Toggle (when closed) */}
        <AnimatePresence>
          {!panelOpen && (
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              type="button"
              onClick={togglePanel}
              className="bg-card/80 backdrop-blur border-border absolute top-4 left-4 z-10 flex flex-col items-center gap-1 rounded-lg border px-2 py-3 shadow-lg hover:bg-card"
              title="展开面板"
            >
              <ChevronRight size={16} />
              <span className="text-[10px] font-medium [writing-mode:vertical-rl]">模型与标签</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* BabylonScene */}
        <BabylonScene
          ref={sceneRef}
          models={modelSources}
          showGrid={showGrid}
          showAxes={showAxes}
          onModelProgress={setModelProgress}
          className="h-full w-full"
        />

        <ViewportControls
          sceneRef={sceneRef}
          showGrid={showGrid}
          onToggleGrid={toggleGrid}
          showAxes={showAxes}
          onToggleAxes={toggleAxes}
        />
      </div>
    </div>
  );
}

// ========================================
// Model File Row Component
// ========================================

interface ModelFileRowProps {
  file: ModelFileEntry;
  fileName: string;
  ext: string;
  isVisible: boolean;
  isLoading: boolean;
  progress: number | undefined;
  index: number;
  totalCount: number;
  onToggleVisible: () => void;
  onRoleChange: (role: string) => void;
  onPriorityChange: (priority: "critical" | "background") => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function ModelFileRow({
  file,
  fileName,
  ext,
  isVisible,
  isLoading,
  progress,
  onToggleVisible,
  onRoleChange,
  onPriorityChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: ModelFileRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5 transition-colors hover:bg-muted/50"
    >
      {/* Drag handle */}
      <span className="flex shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing">
        <GripVertical size={14} />
      </span>

      {/* File icon */}
      <File size={14} className="shrink-0 text-blue-500" />

      {/* File name */}
      <span className="min-w-0 flex-1 truncate text-xs">{fileName}</span>

      {/* Role input */}
      <input
        value={file.role ?? ""}
        onChange={(e) => onRoleChange(e.target.value)}
        placeholder="role"
        className="h-5 w-16 shrink-0 rounded border bg-background px-1 text-[10px] outline-none placeholder:text-muted-foreground/50"
        title="语义角色（用于标签绑定）"
      />

      {/* Extension badge */}
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {ext}
      </Badge>

      {/* Priority dropdown */}
      <select
        value={file.priority ?? "background"}
        onChange={(e) => onPriorityChange(e.target.value as "critical" | "background")}
        className="h-5 shrink-0 rounded border bg-background px-1 text-[10px] outline-none"
        title="加载优先级"
      >
        <option value="critical">优先</option>
        <option value="background">后台</option>
      </select>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={onToggleVisible}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
        title={isVisible ? "隐藏模型" : "显示模型"}
      >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} className="opacity-40" />}
      </button>

      {/* Delete */}
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        onClick={onDelete}
        title="删除"
      >
        <Trash2 size={12} />
      </button>

      {/* Loading progress */}
      {isLoading && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-md bg-muted">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${(progress ?? 0) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
