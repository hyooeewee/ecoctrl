import {
  Box,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Upload,
  Trash2,
  X,
  File,
  AlertCircle,
  Plus,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui";

import AppButton from "@/components/AppButton";
import TruncatedText from "@/components/TruncatedText";
import { resolveAssetUrl } from "@/lib/url";
import type { PointItem } from "@/types";
import type { Model3D } from "@ecoctrl/shared";
import { modelsApi } from "../api/models";
import ModelViewer from "../components/ModelViewer";

const ACCEPTED_FORMATS = ".glb,.gltf,.zip,.obj,.fbx";
const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "GLTF (zip)",
  obj: "OBJ",
  fbx: "FBX",
};

const CARD_PREVIEW_FORMATS = new Set(["GLB", "GLTF", "GLTF (zip)"]);

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export default function Models() {
  const [models, setModels] = useState<Model3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewModel, setPreviewModel] = useState<Model3D | null>(null);

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadVersion, setUploadVersion] = useState("v1.0");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadPoints, setUploadPoints] = useState<PointItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await modelsApi.list();
      setModels(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Lazy-load model-viewer when there are previewable models without thumbnails
  useEffect(() => {
    if (
      models.some(
        (m) => !m.thumbnailUrl && CARD_PREVIEW_FORMATS.has(m.format.toUpperCase()) && m.fileUrl,
      )
    ) {
      import("@google/model-viewer").catch(() => {});
    }
  }, [models]);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FORMAT_MAP[ext]) {
      setUploadError(`不支持的格式: .${ext}，请上传 ${ACCEPTED_FORMATS} 文件`);
      return;
    }
    setUploadFile(file);
    setUploadError("");
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;

    // Validate duplicate point IDs
    const ids = uploadPoints.map((p) => p.id.trim()).filter(Boolean);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) {
      setUploadError(`点位 ID "${dup}" 重复，请检查`);
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const validPoints = uploadPoints.filter((p) => p.id.trim() || p.name.trim());
      await modelsApi.upload(uploadFile, {
        name: uploadName.trim(),
        version: uploadVersion.trim() || "v1.0",
        points: validPoints.length ? validPoints : undefined,
      });
      setUploadOpen(false);
      resetUpload();
      await fetchModels();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadVersion("v1.0");
    setUploadError("");
    setDragActive(false);
    setUploadPoints([]);
  };

  const addPoint = () => {
    setUploadPoints((prev) => [...prev, { id: "", name: "" }]);
  };

  const removePoint = (index: number) => {
    setUploadPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, field: keyof PointItem, value: string) => {
    setUploadPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除模型 "${name}" 吗？`)) return;
    try {
      await modelsApi.delete(id);
      await fetchModels();
    } catch (err) {
      console.error(err);
      alert("删除失败，请重试");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="models" className="flex items-center gap-2 px-6">
            <Box size={16} />
            模型资源
          </TabsTrigger>
          <TabsTrigger value="objects" className="flex items-center gap-2 px-6">
            <Layers size={16} />
            业务对象
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-0">
          <Card className="border-none shadow-sm">
            <CardHeader className="px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>模型资源</CardTitle>
                  <CardDescription>管理已导入的所有 3D 资产模型。</CardDescription>
                </div>
                <AppButton level="action" className="gap-2" onClick={() => setUploadOpen(true)}>
                  <Upload size={16} />
                  上传模型
                </AppButton>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : error ? (
                <div className="flex h-64 items-center justify-center text-sm text-red-400">
                  数据加载失败，请稍后重试
                </div>
              ) : models.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-20">
                  <Box className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-sm font-semibold text-foreground">暂无模型数据</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    点击右上角"上传模型"按钮导入 3D 资产。
                  </p>
                  <AppButton
                    level="action"
                    className="mt-4 gap-2"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload size={16} />
                    上传模型
                  </AppButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {models.map((model) => (
                    <Card
                      key={model.id}
                      className="group relative cursor-pointer transition-colors hover:border-blue-200 pt-0"
                    >
                      <div
                        className="border-border/50 relative flex aspect-video items-center justify-center overflow-hidden border-b bg-muted"
                        onClick={() => setPreviewModel(model)}
                      >
                        {model.thumbnailUrl ? (
                          <img
                            src={resolveAssetUrl(model.thumbnailUrl)}
                            alt={model.name}
                            className="h-full w-full object-cover"
                          />
                        ) : model.fileUrl &&
                          CARD_PREVIEW_FORMATS.has(model.format.toUpperCase()) ? (
                          <model-viewer
                            src={resolveAssetUrl(model.fileUrl)}
                            alt={model.name}
                            auto-rotate
                            interaction-prompt="none"
                            shadow-intensity="1"
                            exposure="1"
                            loading="eager"
                            className="pointer-events-none h-full w-full"
                            style={{ backgroundColor: "transparent" }}
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground/40 transition-transform group-hover:scale-110" />
                        )}
                        <div className="absolute inset-0 bg-black/5 transition-colors group-hover:bg-transparent" />

                        {/* Delete button */}
                        <AppButton
                          level="danger"
                          size="icon-sm"
                          className="absolute top-2 left-2 z-10 h-8 w-8 rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(model.id, model.name);
                          }}
                        >
                          <Trash2 size={14} />
                        </AppButton>

                        {/* Preview button */}
                        <AppButton
                          level="ghost"
                          size="icon-sm"
                          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full border bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-background hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModel(model);
                          }}
                        >
                          <ExternalLink size={14} />
                        </AppButton>
                      </div>
                      <CardContent className="px-4 py-3">
                        <TruncatedText
                          text={model.name}
                          className="block text-sm font-semibold"
                          showTooltip={false}
                        />
                        <p className="mt-1 text-xs text-nowrap text-muted-foreground">
                          {model.version} / {model.format} / {model.size}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objects" className="mt-0">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted p-20">
            <div className="text-center">
              <Layers className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">对象列表暂无数据</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                点击"新增对象"按钮开始管理系统资产。
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUpload();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={18} />
              上传 3D 模型
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragActive
                  ? "border-blue-400 bg-blue-50/50"
                  : "border-border bg-muted hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              {uploadFile ? (
                <div className="flex items-center gap-3">
                  <File size={32} className="text-blue-500" />
                  <div className="text-left">
                    <p className="max-w-[200px] break-all text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.size)} /{" "}
                      {FORMAT_MAP[uploadFile.name.split(".").pop()?.toLowerCase() ?? ""] ??
                        "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                      setUploadName("");
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload size={32} className="text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium">点击或拖拽文件到此处</p>
                  <p className="mt-1 text-xs text-muted-foreground">支持 {ACCEPTED_FORMATS}</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="model-name">模型名称</Label>
                <Input
                  id="model-name"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="请输入模型名称"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model-version">版本</Label>
                <Input
                  id="model-version"
                  value={uploadVersion}
                  onChange={(e) => setUploadVersion(e.target.value)}
                  placeholder="v1.0"
                />
              </div>
            </div>

            {/* Points configuration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>点位配置（可选）</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-blue-600 hover:text-blue-700"
                  onClick={addPoint}
                >
                  <Plus size={14} />
                  添加点位
                </Button>
              </div>
              {uploadPoints.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">未配置点位</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {uploadPoints.map((point, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={point.id}
                        onChange={(e) => updatePoint(index, "id", e.target.value)}
                        placeholder="点位 ID"
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        value={point.name}
                        onChange={(e) => updatePoint(index, "name", e.target.value)}
                        placeholder="点位名称"
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removePoint(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {uploadError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                取消
              </Button>
              <AppButton
                level="action"
                onClick={handleUpload}
                disabled={!uploadFile || !uploadName.trim() || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    确认上传
                  </>
                )}
              </AppButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewModel} onOpenChange={(open) => !open && setPreviewModel(null)}>
        <DialogContent className="flex h-[80vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b p-4 pr-14">
            <DialogTitle className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <Box className="text-blue-600" size={18} />
              <div className="min-w-0 overflow-hidden">
                <TruncatedText
                  text={previewModel?.name ?? ""}
                  className="block text-base font-semibold"
                />
              </div>
              <span className="text-muted-foreground text-sm font-normal">
                {previewModel?.version} / {previewModel?.format}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted p-4">
            {previewModel ? (
              <ModelViewer
                src={resolveAssetUrl(previewModel.fileUrl) ?? null}
                alt={previewModel.name}
                format={previewModel.format}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                暂无模型文件
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
