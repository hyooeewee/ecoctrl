import {
  Box,
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  AlertCircle,
  Plus,
  Pencil,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui";

import AppButton from "@/components/AppButton";
import ModelFileZone from "@/components/ModelFileZone";
import TruncatedText from "@/components/TruncatedText";
import { resolveAssetUrl } from "@/lib/url";
import type { BusinessObject, PointItem } from "@/types";
import type { Model3D } from "@ecoctrl/shared";
import { modelsApi, objectsApi } from "../api/models";
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
  const [uploadPoints, setUploadPoints] = useState<PointItem[]>([]);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editModelId, setEditModelId] = useState("");
  const [editName, setEditName] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editPoints, setEditPoints] = useState<PointItem[]>([]);
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFileDeleted, setEditFileDeleted] = useState(false);

  // Objects tab state
  const [objects, setObjects] = useState<BusinessObject[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectOpen, setObjectOpen] = useState(false);
  const [objectId, setObjectId] = useState("");
  const [objectName, setObjectName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [objectPointValues, setObjectPointValues] = useState<
    Record<string, Record<string, string>>
  >({});
  const [objectError, setObjectError] = useState("");
  const [isCreatingObject, setIsCreatingObject] = useState(false);

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

  const handleUploadFileSelect = (file: File) => {
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
      const validPoints = uploadPoints
        .filter((p) => p.id.trim() || p.name.trim())
        .map((p) => ({
          ...p,
          props: p.props.filter((prop) => prop.key.trim() || prop.name.trim()),
        }));
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
    setUploadPoints([]);
  };

  const addPoint = () => {
    setUploadPoints((prev) => [...prev, { id: "", name: "", props: [] }]);
  };

  const addProp = (pointIndex: number) => {
    setUploadPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex ? { ...p, props: [...p.props, { key: "", name: "" }] } : p,
      ),
    );
  };

  const removeProp = (pointIndex: number, propIndex: number) => {
    setUploadPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex ? { ...p, props: p.props.filter((_, j) => j !== propIndex) } : p,
      ),
    );
  };

  const updateProp = (
    pointIndex: number,
    propIndex: number,
    field: "key" | "name" | "unit",
    value: string,
  ) => {
    setUploadPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex
          ? {
              ...p,
              props: p.props.map((prop, j) =>
                j === propIndex ? { ...prop, [field]: value } : prop,
              ),
            }
          : p,
      ),
    );
  };

  const removePoint = (index: number) => {
    setUploadPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, field: keyof PointItem, value: string) => {
    setUploadPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const fetchObjects = useCallback(async () => {
    setObjectsLoading(true);
    try {
      const data = await objectsApi.list();
      setObjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setObjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const resetObjectForm = () => {
    setObjectId("");
    setObjectName("");
    setSelectedModelId("");
    setObjectPointValues({});
    setObjectError("");
  };

  const handleCreateObject = async () => {
    if (!objectId.trim() || !objectName.trim() || !selectedModelId) {
      setObjectError("请填写对象ID、名称并选择模型");
      return;
    }
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) {
      setObjectError("所选模型不存在");
      return;
    }

    setIsCreatingObject(true);
    setObjectError("");
    try {
      const points =
        (model as Model3D & { points?: PointItem[] }).points?.map((p) => {
          const pointId = p.id.trim();
          return {
            id: `${objectId.trim()}_${pointId}`,
            pointId: pointId,
            pointName: p.name,
            values: objectPointValues[pointId] ?? {},
          };
        }) ?? [];

      await objectsApi.create({
        id: objectId.trim(),
        name: objectName.trim(),
        modelId: selectedModelId,
        modelName: model.name,
        points,
      });
      setObjectOpen(false);
      resetObjectForm();
      await fetchObjects();
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setIsCreatingObject(false);
    }
  };

  const handleDeleteObject = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除业务对象 "${name}" 吗？`)) return;
    try {
      await objectsApi.delete(id);
      await fetchObjects();
    } catch (err) {
      console.error(err);
      alert("删除失败，请重试");
    }
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

  // Edit dialog functions
  const openEditDialog = (model: Model3D) => {
    setEditModelId(model.id);
    setEditName(model.name);
    setEditVersion(model.version);
    setEditPoints((model as Model3D & { points?: PointItem[] }).points ?? []);
    setEditFileDeleted(false);
    setEditError("");
    setEditOpen(true);
  };

  const handleEditFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FORMAT_MAP[ext]) {
      setEditError(`不支持的格式: .${ext}，请上传 ${ACCEPTED_FORMATS} 文件`);
      return;
    }
    setEditFile(file);
    setEditError("");
  };

  const resetEditForm = () => {
    setEditModelId("");
    setEditName("");
    setEditVersion("");
    setEditPoints([]);
    setEditError("");
    setEditFile(null);
    setEditFileDeleted(false);
  };

  const handleSaveEdit = async () => {
    if (!editModelId || !editName.trim()) return;

    // Validate duplicate point IDs
    const ids = editPoints.map((p) => p.id.trim()).filter(Boolean);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) {
      setEditError(`点位 ID "${dup}" 重复，请检查`);
      return;
    }

    setIsSaving(true);
    setEditError("");
    try {
      const validPoints = editPoints
        .filter((p) => p.id.trim() || p.name.trim())
        .map((p) => ({
          ...p,
          props: p.props.filter((prop) => prop.key.trim() || prop.name.trim()),
        }));

      const updatePayload: {
        name: string;
        version: string;
        points: PointItem[];
        fileUrl?: string | null;
      } = {
        name: editName.trim(),
        version: editVersion.trim() || "v1.0",
        points: validPoints.length ? validPoints : [],
      };

      // If current file was deleted, send fileUrl: null
      if (editFileDeleted) {
        updatePayload.fileUrl = null;
      }

      // 1. Update metadata
      await modelsApi.update(editModelId, updatePayload);

      // 2. Replace file if selected (only when not deleted)
      if (editFile && !editFileDeleted) {
        await modelsApi.replaceFile(editModelId, editFile);
      }

      setEditOpen(false);
      resetEditForm();
      await fetchModels();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const addEditPoint = () => {
    setEditPoints((prev) => [...prev, { id: "", name: "", props: [] }]);
  };

  const addEditProp = (pointIndex: number) => {
    setEditPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex ? { ...p, props: [...p.props, { key: "", name: "" }] } : p,
      ),
    );
  };

  const removeEditProp = (pointIndex: number, propIndex: number) => {
    setEditPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex ? { ...p, props: p.props.filter((_, j) => j !== propIndex) } : p,
      ),
    );
  };

  const updateEditProp = (
    pointIndex: number,
    propIndex: number,
    field: "key" | "name" | "unit",
    value: string,
  ) => {
    setEditPoints((prev) =>
      prev.map((p, i) =>
        i === pointIndex
          ? {
              ...p,
              props: p.props.map((prop, j) =>
                j === propIndex ? { ...prop, [field]: value } : prop,
              ),
            }
          : p,
      ),
    );
  };

  const removeEditPoint = (index: number) => {
    setEditPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditPoint = (index: number, field: keyof PointItem, value: string) => {
    setEditPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
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

                        {/* Edit button */}
                        <AppButton
                          level="ghost"
                          size="icon-sm"
                          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full border bg-background/80 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-background hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(model);
                          }}
                        >
                          <Pencil size={14} />
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
          <Card className="border-none shadow-sm">
            <CardHeader className="px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>业务对象</CardTitle>
                  <CardDescription>基于模型创建业务对象实例，为点位属性赋值。</CardDescription>
                </div>
                <AppButton level="action" className="gap-2" onClick={() => setObjectOpen(true)}>
                  <Plus size={16} />
                  新增对象
                </AppButton>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {objectsLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : objects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-16">
                  <Layers className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-sm font-semibold text-foreground">暂无业务对象</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    点击右上角"新增对象"按钮创建。
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                          对象ID
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                          对象名称
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                          关联模型
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                          点位数量
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {objects.map((obj) => (
                        <tr key={obj.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="px-3 py-2.5 font-mono text-xs">{obj.id}</td>
                          <td className="px-3 py-2.5">{obj.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{obj.modelName}</td>
                          <td className="px-3 py-2.5">{obj.points.length}</td>
                          <td className="px-3 py-2.5 text-right">
                            <AppButton
                              level="danger"
                              size="icon-sm"
                              className="h-7 w-7"
                              onClick={() => handleDeleteObject(obj.id, obj.name)}
                            >
                              <Trash2 size={14} />
                            </AppButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
            <ModelFileZone
              file={uploadFile}
              onFileSelect={handleUploadFileSelect}
              onFileClear={() => {
                setUploadFile(null);
                setUploadName("");
              }}
            />

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
            <div className="space-y-3">
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
                <p className="text-xs text-muted-foreground py-1">未配置点位</p>
              ) : (
                <div className="space-y-3 pr-1">
                  {uploadPoints.map((point, pointIdx) => (
                    <div
                      key={pointIdx}
                      className="rounded-lg border border-border bg-muted/40 p-3 space-y-2"
                    >
                      {/* Point header */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={point.id}
                          onChange={(e) => updatePoint(pointIdx, "id", e.target.value)}
                          placeholder="点位 ID"
                          className="h-8 text-sm flex-1"
                        />
                        <Input
                          value={point.name}
                          onChange={(e) => updatePoint(pointIdx, "name", e.target.value)}
                          placeholder="点位名称"
                          className="h-8 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removePoint(pointIdx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Props section */}
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">属性定义</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => addProp(pointIdx)}
                          >
                            <Plus size={12} />
                            添加属性
                          </Button>
                        </div>
                        {point.props.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70 py-1">无属性</p>
                        ) : (
                          <div className="space-y-1.5">
                            {point.props.map((prop, propIdx) => (
                              <div key={propIdx} className="flex items-center gap-2">
                                <Input
                                  value={prop.key}
                                  onChange={(e) =>
                                    updateProp(pointIdx, propIdx, "key", e.target.value)
                                  }
                                  placeholder="key"
                                  className="h-7 text-xs flex-1"
                                />
                                <Input
                                  value={prop.name}
                                  onChange={(e) =>
                                    updateProp(pointIdx, propIdx, "name", e.target.value)
                                  }
                                  placeholder="名称"
                                  className="h-7 text-xs flex-1"
                                />
                                <Input
                                  value={prop.unit ?? ""}
                                  onChange={(e) =>
                                    updateProp(pointIdx, propIdx, "unit", e.target.value)
                                  }
                                  placeholder="单位"
                                  className="h-7 text-xs w-16"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                                  onClick={() => removeProp(pointIdx, propIdx)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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

      {/* Create Object Dialog */}
      <Dialog
        open={objectOpen}
        onOpenChange={(open) => {
          setObjectOpen(open);
          if (!open) resetObjectForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} />
              新增业务对象
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>选择模型</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="object-id">对象ID</Label>
              <Input
                id="object-id"
                value={objectId}
                onChange={(e) => setObjectId(e.target.value)}
                placeholder="请输入对象ID（唯一标识）"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="object-name">对象名称</Label>
              <Input
                id="object-name"
                value={objectName}
                onChange={(e) => setObjectName(e.target.value)}
                placeholder="请输入对象名称"
              />
            </div>

            {/* Point values section */}
            {selectedModelId && (
              <div className="space-y-3">
                <Label>点位属性值</Label>
                {((): PointItem[] => {
                  const model = models.find((m) => m.id === selectedModelId);
                  return (model as Model3D & { points?: PointItem[] })?.points ?? [];
                })().length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">所选模型未配置点位</p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {((): PointItem[] => {
                      const model = models.find((m) => m.id === selectedModelId);
                      return (model as Model3D & { points?: PointItem[] })?.points ?? [];
                    })().map((point) => (
                      <div
                        key={point.id}
                        className="rounded-lg border border-border bg-muted/40 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{point.name || point.id}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {objectId.trim() || "{id}"}_{point.id}
                          </span>
                        </div>
                        {point.props.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70 py-1">无属性</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {point.props.map((prop) => (
                              <div key={prop.key} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                  {prop.name || prop.key}
                                  {prop.unit ? ` (${prop.unit})` : ""}
                                </Label>
                                <Input
                                  value={objectPointValues[point.id]?.[prop.key] ?? ""}
                                  onChange={(e) =>
                                    setObjectPointValues((prev) => ({
                                      ...prev,
                                      [point.id]: {
                                        ...prev[point.id],
                                        [prop.key]: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="值"
                                  className="h-8 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {objectError && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {objectError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setObjectOpen(false)}>
                取消
              </Button>
              <AppButton
                level="action"
                onClick={handleCreateObject}
                disabled={
                  !objectId.trim() || !objectName.trim() || !selectedModelId || isCreatingObject
                }
                className="gap-2"
              >
                {isCreatingObject ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    确认创建
                  </>
                )}
              </AppButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) resetEditForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} />
              编辑模型
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Replace file zone */}
            <div className="space-y-1.5">
              <Label>替换模型文件（可选）</Label>
              {(() => {
                const model = models.find((m) => m.id === editModelId);
                const existingInfo =
                  editFileDeleted || !model?.fileUrl
                    ? null
                    : { name: model.name, size: model.size, format: model.format };
                return (
                  <ModelFileZone
                    file={editFile}
                    existingInfo={existingInfo}
                    onFileSelect={handleEditFileSelect}
                    onFileClear={() => setEditFile(null)}
                    onDeleteExisting={() => setEditFileDeleted(true)}
                  />
                );
              })()}
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">模型名称</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="请输入模型名称"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-version">版本</Label>
                <Input
                  id="edit-version"
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value)}
                  placeholder="v1.0"
                />
              </div>
            </div>

            {/* Points configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>点位配置（可选）</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-blue-600 hover:text-blue-700"
                  onClick={addEditPoint}
                >
                  <Plus size={14} />
                  添加点位
                </Button>
              </div>
              {editPoints.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">未配置点位</p>
              ) : (
                <div className="space-y-3 pr-1">
                  {editPoints.map((point, pointIdx) => (
                    <div
                      key={pointIdx}
                      className="rounded-lg border border-border bg-muted/40 p-3 space-y-2"
                    >
                      {/* Point header */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={point.id}
                          onChange={(e) => updateEditPoint(pointIdx, "id", e.target.value)}
                          placeholder="点位 ID"
                          className="h-8 text-sm flex-1"
                        />
                        <Input
                          value={point.name}
                          onChange={(e) => updateEditPoint(pointIdx, "name", e.target.value)}
                          placeholder="点位名称"
                          className="h-8 text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeEditPoint(pointIdx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Props section */}
                      <div className="space-y-1.5 pl-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">属性定义</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-xs text-blue-600 hover:text-blue-700"
                            onClick={() => addEditProp(pointIdx)}
                          >
                            <Plus size={12} />
                            添加属性
                          </Button>
                        </div>
                        {point.props.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70 py-1">无属性</p>
                        ) : (
                          <div className="space-y-1.5">
                            {point.props.map((prop, propIdx) => (
                              <div key={propIdx} className="flex items-center gap-2">
                                <Input
                                  value={prop.key}
                                  onChange={(e) =>
                                    updateEditProp(pointIdx, propIdx, "key", e.target.value)
                                  }
                                  placeholder="key"
                                  className="h-7 text-xs flex-1"
                                />
                                <Input
                                  value={prop.name}
                                  onChange={(e) =>
                                    updateEditProp(pointIdx, propIdx, "name", e.target.value)
                                  }
                                  placeholder="名称"
                                  className="h-7 text-xs flex-1"
                                />
                                <Input
                                  value={prop.unit ?? ""}
                                  onChange={(e) =>
                                    updateEditProp(pointIdx, propIdx, "unit", e.target.value)
                                  }
                                  placeholder="单位"
                                  className="h-7 text-xs w-16"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                                  onClick={() => removeEditProp(pointIdx, propIdx)}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editError && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle size={14} />
                {editError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <AppButton
                level="action"
                onClick={handleSaveEdit}
                disabled={!editName.trim() || isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Pencil size={16} />
                    确认保存
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
