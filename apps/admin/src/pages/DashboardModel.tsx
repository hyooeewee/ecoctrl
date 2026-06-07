// ========================================
// Dashboard Model Configuration Page
// ========================================

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Save, Eye, Grid3X3, Axis3D, File, X } from "lucide-react";
import { Button } from "@ecoctrl/ui";
import { Card, CardContent } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@ecoctrl/ui";

import AppButton from "@/components/AppButton";
import ModelFileZone from "@/components/ModelFileZone";
import {
  BabylonScene,
  BabylonSceneRef,
  useMeshPicking,
  useLabelMarkers,
  LabelTree,
  LabelConfigForm,
  OperationConfig,
  LabelConfig,
  LabelOperation,
  LabelTreeNode,
  LabelMarkerData,
} from "@/components/babylon-editor";
import { dashboardModelApi } from "../api/dashboardModel";
import type { DashboardModelConfig, DashboardModelLabel, ModelFileEntry } from "@ecoctrl/shared";
import { Vector3 } from "@babylonjs/core";

// ========================================
// Types
// ========================================

type Label = DashboardModelLabel;

type EditorMode = "select" | "placeLabel" | "clipPreview";

// ========================================
// Component
// ========================================

export default function DashboardModel() {
  // ========================================
  // State
  // ========================================

  const [config, setConfig] = useState<DashboardModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  const sceneRef = useRef<BabylonSceneRef>(null);

  // ========================================
  // Data Loading
  // ========================================

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await dashboardModelApi.get();
        setConfig(data);
        // Load labels from config if available
        if (data.labels) {
          setLabels(data.labels as Label[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // ========================================
  // File Upload (one at a time)
  // ========================================

  const handleUploadNext = async () => {
    if (pendingFiles.length === 0) return;
    const [nextFile, ...rest] = pendingFiles;
    setUploading(true);
    try {
      const updated = await dashboardModelApi.upload(nextFile);
      setConfig(updated);
      setPendingFiles(rest);
      toast.success(`已上传: ${nextFile.name}`);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(`上传失败: ${nextFile.name}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddFiles = (files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearPendingFiles = () => {
    setPendingFiles([]);
  };

  // ========================================
  // Label Management
  // ========================================

  const selectedLabel = useMemo(
    () => labels.find((l) => l.id === selectedLabelId) ?? null,
    [labels, selectedLabelId],
  );

  const handleLabelPick = useCallback(
    (info: { position: Vector3 }) => {
      if (editorMode !== "placeLabel") return;

      const newLabel: Label = {
        id: `label_${Date.now()}`,
        key: `label_${labels.length + 1}`,
        name: `标签 ${labels.length + 1}`,
        description: "",
        parentId: null,
        position: {
          x: parseFloat(info.position.x.toFixed(3)),
          y: parseFloat(info.position.y.toFixed(3)),
          z: parseFloat(info.position.z.toFixed(3)),
        },
        meshKeywords: [],
        operations: [],
        order: labels.length,
      };

      setLabels((prev) => [...prev, newLabel]);
      setSelectedLabelId(newLabel.id);
      setEditorMode("select");
      toast.success("标签已添加");
    },
    [editorMode, labels.length],
  );

  const handleLabelSelect = useCallback((id: string) => {
    setSelectedLabelId(id);
    setEditorMode("select");
  }, []);

  const handleLabelAdd = useCallback(
    (parentId?: string) => {
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

      setLabels((prev) => [...prev, newLabel]);
      setSelectedLabelId(newLabel.id);
    },
    [labels.length],
  );

  const handleLabelDelete = useCallback(
    (id: string) => {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      if (selectedLabelId === id) {
        setSelectedLabelId(null);
      }
      toast.success("标签已删除");
    },
    [selectedLabelId],
  );

  const handleLabelEdit = useCallback((id: string) => {
    setSelectedLabelId(id);
  }, []);

  const handleLabelConfigChange = useCallback((config: LabelConfig) => {
    setLabels((prev) =>
      prev.map((l) =>
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
    );
  }, []);

  const handleOperationsChange = useCallback(
    (operations: LabelOperation[]) => {
      if (!selectedLabelId) return;
      setLabels((prev) => prev.map((l) => (l.id === selectedLabelId ? { ...l, operations } : l)));
    },
    [selectedLabelId],
  );

  // ========================================
  // Mesh Picking
  // ========================================

  const { pickedInfo, clearPick } = useMeshPicking({
    scene: sceneRef.current?.scene ?? null,
    enabled: editorMode === "placeLabel",
    onPick: handleLabelPick,
  });

  // ========================================
  // Label Markers
  // ========================================

  const labelMarkers: LabelMarkerData[] = useMemo(
    () =>
      labels.map((l) => ({
        id: l.id,
        key: l.key,
        name: l.name,
        position: new Vector3(l.position.x, l.position.y, l.position.z),
        isSelected: l.id === selectedLabelId,
        hasChildren: labels.some((child) => child.parentId === l.id),
      })),
    [labels, selectedLabelId],
  );

  useLabelMarkers({
    scene: sceneRef.current?.scene ?? null,
    guiTexture: sceneRef.current?.guiTexture ?? null,
    labels: labelMarkers,
    selectedId: selectedLabelId,
    onLabelClick: handleLabelSelect,
  });

  // ========================================
  // Label Tree Data
  // ========================================

  const labelTreeData: LabelTreeNode[] = useMemo(() => {
    const map = new Map<string, LabelTreeNode>();
    const roots: LabelTreeNode[] = [];

    // Create nodes
    labels.forEach((l) => {
      map.set(l.id, {
        id: l.id,
        key: l.key,
        name: l.name,
        parentId: l.parentId ?? undefined,
        children: [],
        operationCount: l.operations.length,
      });
    });

    // Build tree
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [labels]);

  // ========================================
  // Save
  // ========================================

  const handleSave = async () => {
    setSaving(true);
    try {
      await dashboardModelApi.update({ labels });
      toast.success("配置已保存");
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  // ========================================
  // Existing file info
  // ========================================

  const existingFiles: ModelFileEntry[] = config?.modelFiles?.length
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

  // ========================================
  // Render
  // ========================================

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-background p-2">
        <div className="flex items-center gap-1 border-r pr-2">
          <AppButton
            level={editorMode === "select" ? "action" : "ghost"}
            size="sm"
            onClick={() => setEditorMode("select")}
          >
            选择
          </AppButton>
          <AppButton
            level={editorMode === "placeLabel" ? "action" : "ghost"}
            size="sm"
            onClick={() => setEditorMode("placeLabel")}
          >
            放置标签
          </AppButton>
          <AppButton
            level={editorMode === "clipPreview" ? "action" : "ghost"}
            size="sm"
            onClick={() => setEditorMode("clipPreview")}
          >
            剖切预览
          </AppButton>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 border-l pl-2">
          <AppButton
            level={showGrid ? "action" : "ghost"}
            size="icon-sm"
            onClick={() => setShowGrid(!showGrid)}
            title="网格"
          >
            <Grid3X3 size={16} />
          </AppButton>
          <AppButton
            level={showAxes ? "action" : "ghost"}
            size="icon-sm"
            onClick={() => setShowAxes(!showAxes)}
            title="坐标轴"
          >
            <Axis3D size={16} />
          </AppButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 3D Viewport */}
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-none shadow-sm lg:col-span-2">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <BabylonScene
              ref={sceneRef}
              src={config?.modelFileUrl ?? null}
              className="h-full w-full flex-1"
            />
          </CardContent>
        </Card>

        {/* Right Panel */}
        <Card className="flex flex-col overflow-hidden border-none shadow-sm lg:col-span-1">
          <CardContent className="flex flex-1 flex-col overflow-hidden p-4">
            {/* Model Files */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">模型文件</h3>
                <span className="text-xs text-muted-foreground">{existingFiles.length} 个文件</span>
              </div>

              {/* Existing files list */}
              {existingFiles.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {existingFiles.map((file, index) => {
                    const fileName = file.name || file.fileKey.split("/").pop() || "未知";
                    const ext = fileName.split(".").pop()?.toUpperCase() ?? "";
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <File size={14} className="shrink-0 text-blue-500" />
                        <span className="flex-1 truncate text-xs">{fileName}</span>
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {ext}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pending files to upload */}
              {pendingFiles.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">待上传</div>
                  {pendingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-md border border-dashed border-blue-400 bg-blue-50/50 px-3 py-2"
                    >
                      <File size={14} className="shrink-0 text-blue-500" />
                      <span className="flex-1 truncate text-xs">{file.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {file.name.split(".").pop()?.toUpperCase()}
                      </Badge>
                      <button
                        type="button"
                        className="ml-1 rounded p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => handleRemovePendingFile(index)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <ModelFileZone
                file={null}
                onFileSelect={(file) => handleAddFiles([file])}
                onFileClear={() => {}}
                acceptedFormats=".glb,.gltf,.obj"
              />

              {/* Upload buttons */}
              {pendingFiles.length > 0 && (
                <div className="mt-2 flex gap-2">
                  <Button className="flex-1" onClick={handleUploadNext} disabled={uploading}>
                    {uploading ? "上传中..." : `上传下一个 (${pendingFiles.length})`}
                  </Button>
                  <Button variant="outline" onClick={handleClearPendingFiles}>
                    清空
                  </Button>
                </div>
              )}
            </div>

            {/* Label Tree */}
            <div className="mb-4 min-h-0 flex-1 overflow-auto">
              <LabelTree
                labels={labelTreeData}
                selectedId={selectedLabelId}
                onSelect={handleLabelSelect}
                onAdd={handleLabelAdd}
                onDelete={handleLabelDelete}
                onEdit={handleLabelEdit}
              />
            </div>

            {/* Label Config */}
            {selectedLabel && (
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">标签配置</h3>
                <div className="max-h-[300px] overflow-auto">
                  <LabelConfigForm
                    config={{
                      id: selectedLabel.id,
                      key: selectedLabel.key,
                      name: selectedLabel.name,
                      description: selectedLabel.description,
                      parentId: selectedLabel.parentId ?? null,
                      position: selectedLabel.position,
                      meshKeywords: selectedLabel.meshKeywords,
                    }}
                    parentOptions={labels
                      .filter((l) => l.id !== selectedLabel.id)
                      .map((l) => ({ id: l.id, name: l.name }))}
                    onChange={handleLabelConfigChange}
                  />

                  <div className="mt-4">
                    <OperationConfig
                      operations={selectedLabel.operations}
                      availableLabelIds={labels
                        .filter((l) => l.id !== selectedLabelId)
                        .map((l) => l.id)}
                      onChange={handleOperationsChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              保存中...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
