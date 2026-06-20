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
  Info,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";
import { ScrollArea } from "@ecoctrl/ui";
import { Tabs, TabsList, TabsTrigger } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from "@ecoctrl/ui/file-upload";

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

  // Visible model IDs for label filtering
  const visibleModelIds = useMemo(
    () => existingFiles.filter((f) => visibleFileIds.has(f.id)).map((f) => f.id),
    [existingFiles, visibleFileIds],
  );

  const labelTreeData: LabelTreeNode[] = useMemo(() => {
    const map = new Map<string, LabelTreeNode>();
    const roots: LabelTreeNode[] = [];

    // Filter: scene labels (no bindings) always show;
    // bound labels only show when ALL bound models are visible.
    const visibleLabels = labels.filter((l) => {
      if (!l.modelBindings || l.modelBindings.length === 0) return true;
      return l.modelBindings.every((id) => visibleModelIds.includes(id));
    });

    visibleLabels.forEach((l) => {
      map.set(l.meta.id, {
        id: l.meta.id,
        name: l.meta.name,
        children: [],
        actionCount: l.actions.length,
      });
    });

    map.forEach((node, id) => {
      const label = visibleLabels.find((l) => l.meta.id === id);
      const parentId = label?.tree.parentId;
      if (parentId && map.has(parentId)) {
        map.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [labels, visibleModelIds]);

  const labelMarkers: LabelMarkerData[] = useMemo(
    () =>
      labels
        .filter((l) => {
          if (l.anchor.position === undefined) return false;
          // Filter by model bindings: scene labels always show,
          // bound labels only when ALL bound models are visible.
          if (!l.modelBindings || l.modelBindings.length === 0) return true;
          return l.modelBindings.every((id) => visibleModelIds.includes(id));
        })
        .map((l) => ({
          id: l.meta.id,
          name: l.meta.name,
          position: new Vector3(l.anchor.position!.x, l.anchor.position!.y, l.anchor.position!.z),
          isSelected: l.meta.id === selectedLabelId,
          hasChildren: labels.some((child) => child.tree.parentId === l.meta.id),
        })),
    [labels, selectedLabelId, visibleModelIds],
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
                        {existingFiles.length === 0 ? (
                          /* Empty state: show FileUpload dropzone */
                          <FileUpload
                            accept=".glb,.gltf,.obj"
                            multiple
                            maxFiles={10}
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
                          >
                            <FileUploadDropzone>
                              <p className="text-xs text-muted-foreground">点击或拖拽文件到此处</p>
                              <p className="text-[10px] text-muted-foreground/60">
                                支持 .glb, .gltf, .obj 格式
                              </p>
                            </FileUploadDropzone>
                          </FileUpload>
                        ) : (
                          /* Has files: show header + file list */
                          <>
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
                            <div className="space-y-1.5">
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
                          </>
                        )}
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
                          addTitle={existingFiles.length === 0 ? "请先上传模型" : "添加标签"}
                        />

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
                                availableModelFiles={existingFiles.map((f) => ({
                                  id: f.id,
                                  name: f.name,
                                  fileKey: f.fileKey,
                                }))}
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
                        {/* Label selector dropdown */}
                        <div className="grid gap-2">
                          <Label className="text-xs">选择标签</Label>
                          <Select
                            value={selectedLabel?.meta.name ?? ""}
                            onValueChange={(v) => {
                              const match = labels.find((l) => l.meta.name === v);
                              selectLabel(match?.meta.id ?? null);
                            }}
                            disabled={existingFiles.length === 0}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue
                                placeholder={
                                  existingFiles.length === 0 ? "请先上传模型" : "选择一个标签"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {labels.map((l) => (
                                <SelectItem key={l.meta.id} value={l.meta.name}>
                                  {l.meta.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedLabel && (
                          <>
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold">
                                {selectedLabel.meta.name} 的动作
                              </h3>
                              <Button
                                size="sm"
                                variant={previewing ? "secondary" : "outline"}
                                onClick={handlePreview}
                                disabled={selectedLabel.actions.length === 0}
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
      className="group relative flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5 transition-colors hover:bg-muted/50"
    >
      {/* Drag handle */}
      <span className="flex shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing">
        <GripVertical size={14} />
      </span>

      {/* File icon */}
      <File size={14} className="shrink-0 text-blue-500" />

      {/* File name */}
      <span className="min-w-0 flex-1 truncate text-xs">{fileName}</span>

      {/* Controls — hidden by default, visible on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Priority dropdown */}
        <select
          value={file.priority ?? "background"}
          onChange={(e) => onPriorityChange(e.target.value as "critical" | "background")}
          className="h-5 rounded border bg-background px-1 text-[10px] outline-none"
          title="加载优先级"
        >
          <option value="critical">优先</option>
          <option value="background">后台</option>
        </select>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={onToggleVisible}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          title={isVisible ? "隐藏模型" : "显示模型"}
        >
          {isVisible ? <Eye size={14} /> : <EyeOff size={14} className="opacity-40" />}
        </button>

        {/* File details tooltip */}
        <span className="relative">
          <Info size={14} className="text-muted-foreground" />
          <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-1 hidden w-48 rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:block">
            <div className="font-medium">{fileName}</div>
            <div className="mt-1 text-muted-foreground">
              格式: {ext} · 优先级: {file.priority === "critical" ? "优先加载" : "后台加载"}
            </div>
          </span>
        </span>

        {/* Delete */}
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>

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
