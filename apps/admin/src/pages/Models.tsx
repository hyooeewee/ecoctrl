import {
  Box,
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Pencil,
  Braces,
  ArrowUpDown,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui/table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui/card";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteTrigger,
} from "@ecoctrl/ui/autocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";

import AppButton from "@/components/AppButton";
import { DataTablePanel } from "@/components/DataTablePanel";
import ModelFileZone from "@/components/ModelFileZone";
import TruncatedText from "@/components/TruncatedText";
import { useAppStore } from "@/store/appStore";
import { resolveAssetUrl } from "@/lib/url";
import type { DataModel, Point, BusinessObject } from "@ecoctrl/shared";
import { modelsApi } from "../api/models";
import { objectsApi } from "../api/objects";
import { pointsApi } from "../api/points";
import { toast } from "sonner";
import ModelViewer from "../components/ModelViewer";
import ModelUploadWizard from "@/components/ModelUploadWizard";

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
  const [models, setModels] = useState<DataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewModel, setPreviewModel] = useState<DataModel | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editModelId, setEditModelId] = useState("");
  const [editName, setEditName] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editFileDeleted, setEditFileDeleted] = useState(false);
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Objects tab state
  const [objects, setObjects] = useState<BusinessObject[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectOpen, setObjectOpen] = useState(false);
  const [objectId, setObjectId] = useState("");
  const [objectName, setObjectName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [objectError, setObjectError] = useState("");
  const [isCreatingObject, setIsCreatingObject] = useState(false);
  const [objectDescription, setObjectDescription] = useState("");
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmActionRef = useRef<(() => void) | null>(null);

  // Points tab state
  const [allPoints, setAllPoints] = useState<Point[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Objects tab state
  const [objectSorting, setObjectSorting] = useState<SortingState>([]);
  const [objectColumnFilters, setObjectColumnFilters] = useState<ColumnFiltersState>([]);
  const [objectGlobalFilter, setObjectGlobalFilter] = useState("");

  // Cross-tab navigation
  const [pendingNav, setPendingNav] = useState<{
    tab: "models" | "objects" | "points";
    objectsFilterModelId?: string;
    pointsFilterObjectId?: string;
    pointsFilterModelId?: string;
    highlightModelId?: string;
    highlightObjectId?: string;
  } | null>(null);
  const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);
  const [highlightedObjectId, setHighlightedObjectId] = useState<string | null>(null);

  const activeTab = useAppStore((state) => state.modelsTab);
  const setActiveTab = useAppStore((state) => state.setModelsTab);

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
        (m) =>
          !m.thumbnailUrl &&
          m.format &&
          CARD_PREVIEW_FORMATS.has(m.format.toUpperCase()) &&
          m.fileUrl,
      )
    ) {
      import("@google/model-viewer").catch(() => {});
    }
  }, [models]);

  const handleUploadSuccess = useCallback(async () => {
    await fetchModels();
  }, [fetchModels]);

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

  const fetchPoints = useCallback(async () => {
    setPointsLoading(true);
    try {
      const data = await pointsApi.list();
      setAllPoints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPointsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "points") {
      fetchPoints();
    }
  }, [activeTab, fetchPoints]);

  // Apply pending navigation when tab switches
  useEffect(() => {
    if (!pendingNav || pendingNav.tab !== activeTab) return;

    if (activeTab === "objects" && pendingNav.objectsFilterModelId) {
      const model = models.find((m) => m.id === pendingNav.objectsFilterModelId);
      if (model) {
        setObjectColumnFilters([{ id: "modelName", value: model.name ?? model.code ?? "" }]);
      }
    }

    if (activeTab === "points") {
      const newFilters: ColumnFiltersState = [];
      if (pendingNav.pointsFilterObjectId) {
        const obj = objects.find((o) => o.id === pendingNav.pointsFilterObjectId);
        if (obj) {
          newFilters.push({ id: "objectName", value: obj.name ?? obj.code ?? "" });
        }
      }
      if (pendingNav.pointsFilterModelId) {
        const model = models.find((m) => m.id === pendingNav.pointsFilterModelId);
        if (model) {
          newFilters.push({ id: "modelName", value: model.name ?? model.code ?? "" });
        }
      }
      if (newFilters.length > 0) {
        setColumnFilters(newFilters);
      }
    }

    if (pendingNav.highlightModelId) {
      setHighlightedModelId(pendingNav.highlightModelId);
      setTimeout(() => setHighlightedModelId(null), 3000);
    }
    if (pendingNav.highlightObjectId) {
      setHighlightedObjectId(pendingNav.highlightObjectId);
      setTimeout(() => setHighlightedObjectId(null), 3000);
    }

    setPendingNav(null);
  }, [activeTab, pendingNav, models, objects]);

  const resetObjectForm = () => {
    setObjectId("");
    setObjectName("");
    setObjectDescription("");
    setSelectedModelId("");
    setObjectError("");
    setEditingObjectId(null);
  };

  const buildObjectPayload = (): {
    code: string;
    name: string;
    description: string;
    modelId: string;
  } => {
    return {
      code: objectId.trim().toUpperCase(),
      name: objectName.trim(),
      description: objectDescription.trim(),
      modelId: selectedModelId,
    };
  };

  const openEditObjectDialog = (obj: BusinessObject) => {
    setEditingObjectId(obj.id);
    setObjectId(obj.code ?? "");
    setObjectName(obj.name ?? "");
    setObjectDescription(obj.description ?? "");
    setSelectedModelId(obj.modelId ?? "");
    setObjectError("");
    setObjectOpen(true);
  };

  const validateObjectForm = (): boolean => {
    if (!objectId.trim() || !objectName.trim() || !selectedModelId) {
      setObjectError("请填写编码、名称并选择模型");
      return false;
    }
    if (!/^\d{4}$/.test(objectId.trim())) {
      setObjectError("编码必须为4位数字");
      return false;
    }
    const model = models.find((m) => m.id === selectedModelId);
    if (!model) {
      setObjectError("所选模型不存在");
      return false;
    }
    return true;
  };

  const handleCreateObject = async () => {
    if (!validateObjectForm()) return;
    setIsCreatingObject(true);
    setObjectError("");
    try {
      const payload = buildObjectPayload();
      await objectsApi.create(payload);
      setObjectOpen(false);
      resetObjectForm();
      await fetchObjects();
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setIsCreatingObject(false);
    }
  };

  const handleUpdateObject = async () => {
    if (!editingObjectId) return;
    if (!validateObjectForm()) return;
    setIsCreatingObject(true);
    setObjectError("");
    try {
      const payload = buildObjectPayload();
      await objectsApi.update(editingObjectId, payload);
      setObjectOpen(false);
      resetObjectForm();
      await fetchObjects();
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setIsCreatingObject(false);
    }
  };

  const handleDeleteObject = (id: string, name: string) => {
    setConfirmTitle("确认删除");
    setConfirmDesc(`确定要删除业务对象 "${name}" 吗？此操作不可撤销。`);
    confirmActionRef.current = async () => {
      try {
        await objectsApi.delete(id);
        await fetchObjects();
        setConfirmOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("删除失败，请重试");
      }
    };
    setConfirmOpen(true);
  };

  // Import dialog functions
  const handleImportFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "json" && ext !== "csv" && ext !== "xlsx") {
      setImportError(`不支持的格式: .${ext}，请上传 .json、.csv 或 .xlsx 文件`);
      return;
    }
    setImportFile(file);
    setImportError("");
  };

  const resetImport = () => {
    setImportFile(null);
    setImportError("");
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportError("");
    try {
      const result = await modelsApi.importPoints(importFile);
      setImportOpen(false);
      resetImport();
      await fetchModels();
      await fetchObjects();
      await fetchPoints();
      toast.success(
        `导入成功：创建 ${result.createdModels} 个模型，` +
          `创建 ${result.createdObjects} 个对象，` +
          `创建 ${result.createdPoints} 个点位，` +
          `跳过 ${result.skippedPoints} 个已存在点位。`,
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "导入失败，请重试");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmTitle("确认删除");
    setConfirmDesc(`确定要删除模型 "${name}" 吗？此操作不可撤销。`);
    confirmActionRef.current = async () => {
      try {
        await modelsApi.delete(id);
        await fetchModels();
        setConfirmOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("删除失败，请重试");
      }
    };
    setConfirmOpen(true);
  };

  // Edit dialog functions
  const openEditDialog = (model: DataModel) => {
    setEditModelId(model.id);
    setEditName(model.name ?? "");
    setEditVersion(model.version ?? "");
    setEditCode(model.code ?? "");
    setEditDescription(model.description ?? "");
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
    setEditError("");
    setEditFile(null);
    setEditFileDeleted(false);
    setEditCode("");
    setEditDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editModelId || !editName.trim()) return;
    if (!editCode.trim()) {
      setEditError("编码不能为空");
      return;
    }

    setIsSaving(true);
    setEditError("");
    try {
      const updatePayload: {
        name: string;
        version: string;
        code: string;
        description?: string | null;
        fileUrl?: string | null;
      } = {
        name: editName.trim(),
        version: editVersion.trim() || "v1.0",
        code: editCode.toUpperCase(),
        description: editDescription.trim() || null,
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

  const existingCodes = [...new Set(models.map((m) => m.code).filter(Boolean))];

  const pointColumns = useMemo<
    ColumnDef<
      Point & {
        propCount: number;
        objectId: string;
        modelId: string;
        objectName: string;
        modelName: string;
      }
    >[]
  >(
    () => [
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            点位类型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("type")}</span>,
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            编码
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("code")}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            点位名称
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.getValue("name") || "-",
      },
      {
        accessorKey: "propCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            属性数量
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "objectName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            关联对象
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const objId = row.original.objectId;
          return (
            <button
              className="text-left text-primary hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setPendingNav({ tab: "objects", highlightObjectId: objId });
                setActiveTab("objects");
              }}
            >
              {row.getValue("objectName")}
            </button>
          );
        },
      },
      {
        accessorKey: "modelName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            关联模型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const mId = row.original.modelId;
          return (
            <button
              className="text-left text-primary hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setPendingNav({ tab: "models", highlightModelId: mId });
                setActiveTab("models");
              }}
            >
              {row.getValue("modelName")}
            </button>
          );
        },
      },
    ],
    [setActiveTab],
  );

  const pointsTableData = useMemo(() => {
    return allPoints.map((p) => {
      const obj = objects.find((o) => o.id === p.objectId);
      const model = models.find((m) => m.id === p.modelId);
      return {
        ...p,
        propCount: p.props.length,
        objectId: p.objectId,
        modelId: p.modelId,
        objectName: obj?.name ?? obj?.code ?? p.objectId,
        modelName: model?.name ?? model?.code ?? p.modelId,
      };
    });
  }, [allPoints, objects, models]);

  const table = useReactTable({
    data: pointsTableData,
    columns: pointColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  const objectsTableData = useMemo(() => {
    return objects.map((o) => {
      const model = models.find((m) => m.id === o.modelId);
      return {
        ...o,
        modelName: model?.name ?? model?.code ?? o.modelId,
      };
    });
  }, [objects, models]);

  const objectColumns = useMemo<ColumnDef<BusinessObject & { modelName: string }>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            编码
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("code") || "-"}</span>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            对象名称
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "modelName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            关联模型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const modelId = row.original.modelId;
          return (
            <button
              className="text-left text-primary hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setPendingNav({ tab: "models", highlightModelId: modelId });
                setActiveTab("models");
              }}
            >
              {row.getValue("modelName")}
            </button>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-right block">操作</span>,
        cell: ({ row }) => {
          const obj = row.original;
          return (
            <div className="text-right">
              <AppButton
                level="secondary"
                size="icon-sm"
                className="h-7 w-7 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditObjectDialog(obj);
                }}
              >
                <Pencil size={14} />
              </AppButton>
              <AppButton
                level="danger"
                size="icon-sm"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteObject(obj.id, obj.name);
                }}
              >
                <Trash2 size={14} />
              </AppButton>
            </div>
          );
        },
      },
    ],
    [setActiveTab],
  );

  const objectsTable = useReactTable({
    data: objectsTableData,
    columns: objectColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setObjectSorting,
    onColumnFiltersChange: setObjectColumnFilters,
    onGlobalFilterChange: setObjectGlobalFilter,
    state: {
      sorting: objectSorting,
      columnFilters: objectColumnFilters,
      globalFilter: objectGlobalFilter,
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsContent value="models" className="mt-0 flex h-full flex-col">
          <Card className="flex h-full flex-col overflow-hidden border-none shadow-sm">
            <CardHeader className="shrink-0 px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>数据模型</CardTitle>
                  <CardDescription>管理已导入的所有数据模型。</CardDescription>
                </div>
                <AppButton
                  level="action"
                  className="gap-2"
                  onClick={() => {
                    setUploadOpen(true);
                  }}
                >
                  <Upload size={16} />
                  上传模型
                </AppButton>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-6 pb-6">
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
                    点击右上角"上传模型"按钮导入数据模型。
                  </p>
                  <AppButton
                    level="action"
                    className="mt-4 gap-2"
                    onClick={() => {
                      setUploadOpen(true);
                    }}
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
                      className={`group relative cursor-pointer transition-colors hover:border-blue-200 pt-0 ${highlightedModelId === model.id ? "ring-2 ring-blue-400 border-blue-400" : ""}`}
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
                          model.format &&
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
                      <CardContent
                        className="px-4 py-3 cursor-pointer"
                        onClick={() => {
                          setPendingNav({ tab: "objects", objectsFilterModelId: model.id });
                          setActiveTab("objects");
                        }}
                      >
                        <TruncatedText
                          text={model.name}
                          className="block text-sm font-semibold"
                          showTooltip={false}
                        />
                        {model.code && (
                          <span className="mt-0.5 block text-xs font-mono text-muted-foreground">
                            {model.code}
                          </span>
                        )}
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

        <TabsContent value="objects" className="mt-0 flex h-full flex-col overflow-hidden">
          <DataTablePanel
            title="业务对象"
            description="基于模型创建业务对象实例，为点位属性赋值。"
            loading={objectsLoading}
            emptyIcon={<Layers className="h-12 w-12 text-muted-foreground/40" />}
            emptyTitle="暂无业务对象"
            emptyDescription="点击右上角「新增对象」按钮创建。"
            emptyAction={
              <AppButton
                level="action"
                className="mt-4 gap-2"
                onClick={() => {
                  resetObjectForm();
                  setObjectOpen(true);
                }}
              >
                <Plus size={16} />
                新增对象
              </AppButton>
            }
            action={
              <AppButton
                level="action"
                className="gap-2"
                onClick={() => {
                  resetObjectForm();
                  setObjectOpen(true);
                }}
              >
                <Plus size={16} />
                新增对象
              </AppButton>
            }
            rowCount={objectsTable.getFilteredRowModel().rows.length}
            paginationTable={objectsTable}
          >
            <>
              <div className="flex flex-wrap items-center gap-3 py-4">
                <Input
                  placeholder="筛选对象..."
                  value={objectGlobalFilter}
                  onChange={(e) => setObjectGlobalFilter(e.target.value)}
                  className="max-w-sm"
                />
                <Select
                  value={(objectsTable.getColumn("modelName")?.getFilterValue() as string) ?? ""}
                  onValueChange={(v) => {
                    objectsTable.getColumn("modelName")?.setFilterValue(v || undefined);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="关联模型">
                      {(objectsTable.getColumn("modelName")?.getFilterValue() as
                        | string
                        | undefined) ?? "关联模型"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部模型</SelectItem>
                    {models.map((m) => {
                      const label = m.name ?? m.code ?? "";
                      return (
                        <SelectItem key={m.id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {objectsTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {objectsTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={`cursor-pointer ${highlightedObjectId === row.original.id ? "bg-blue-50" : ""}`}
                        onClick={() => {
                          setPendingNav({
                            tab: "points",
                            pointsFilterObjectId: row.original.id,
                          });
                          setActiveTab("points");
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          </DataTablePanel>
        </TabsContent>

        <TabsContent value="points" className="mt-0 flex h-full flex-col overflow-hidden">
          <DataTablePanel
            title="点位信息"
            description="查看所有数据模型中的点位定义信息。"
            loading={pointsLoading}
            emptyIcon={<Braces className="h-12 w-12 text-muted-foreground/40" />}
            emptyTitle="暂无点位数据"
            emptyDescription="点击右上角「导入点位」按钮导入。"
            emptyAction={
              <AppButton
                level="action"
                className="mt-4 gap-2"
                onClick={() => {
                  resetImport();
                  setImportOpen(true);
                }}
              >
                <Upload size={16} />
                导入点位
              </AppButton>
            }
            action={
              <AppButton
                level="action"
                className="gap-2"
                onClick={() => {
                  resetImport();
                  setImportOpen(true);
                }}
              >
                <Upload size={16} />
                导入点位
              </AppButton>
            }
            rowCount={table.getFilteredRowModel().rows.length}
            paginationTable={table}
          >
            <>
              <div className="flex flex-wrap items-center gap-3 py-4">
                <Input
                  placeholder="筛选点位..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="max-w-sm"
                />
                <Select
                  value={(table.getColumn("objectName")?.getFilterValue() as string) ?? ""}
                  onValueChange={(v) => {
                    table.getColumn("objectName")?.setFilterValue(v || undefined);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="关联对象">
                      {(table.getColumn("objectName")?.getFilterValue() as string | undefined) ??
                        "关联对象"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部对象</SelectItem>
                    {objects.map((o) => (
                      <SelectItem key={o.id} value={o.name ?? o.code}>
                        {o.name ?? o.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={(table.getColumn("modelName")?.getFilterValue() as string) ?? ""}
                  onValueChange={(v) => {
                    table.getColumn("modelName")?.setFilterValue(v || undefined);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="关联模型">
                      {(table.getColumn("modelName")?.getFilterValue() as string | undefined) ??
                        "关联模型"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部模型</SelectItem>
                    {models.map((m) => {
                      const label = m.name ?? m.code ?? "";
                      return (
                        <SelectItem key={m.id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          </DataTablePanel>
        </TabsContent>
      </Tabs>

      {/* Upload Wizard */}
      <ModelUploadWizard
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        existingCodes={existingCodes}
        existingPointTypes={[]}
        onSuccess={handleUploadSuccess}
      />

      {/* Create / Edit Object Dialog */}
      <Dialog
        open={objectOpen}
        onOpenChange={(open) => {
          setObjectOpen(open);
          if (!open) resetObjectForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {editingObjectId ? <Pencil size={18} /> : <Plus size={18} />}
              {editingObjectId ? "编辑业务对象" : "新增业务对象"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">选择模型</label>
                <Select value={selectedModelId} onValueChange={(v) => setSelectedModelId(v ?? "")}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="请选择模型" className="truncate">
                      {selectedModelId
                        ? (models.find((m) => m.id === selectedModelId)?.name ?? "请选择模型")
                        : "请选择模型"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="block truncate">{m.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="object-id"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    编码
                  </label>
                  <Input
                    id="object-id"
                    value={objectId}
                    onChange={(e) => setObjectId(e.target.value)}
                    placeholder="4位数字"
                    maxLength={4}
                    className="h-10 text-center font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="object-name"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    对象名称
                  </label>
                  <Input
                    id="object-name"
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                    placeholder="请输入对象名称"
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="object-description"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  描述
                </label>
                <Input
                  id="object-description"
                  value={objectDescription}
                  onChange={(e) => setObjectDescription(e.target.value)}
                  placeholder="请输入描述（可选）"
                  className="h-10"
                />
              </div>
            </div>

            {objectError && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {objectError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setObjectOpen(false)} className="h-10 px-5">
              取消
            </Button>
            <AppButton
              level="action"
              onClick={() => {
                if (editingObjectId) {
                  handleUpdateObject();
                } else {
                  handleCreateObject();
                }
              }}
              disabled={
                !objectId.trim() || !objectName.trim() || !selectedModelId || isCreatingObject
              }
              className="h-10 px-5 gap-2"
            >
              {isCreatingObject ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {editingObjectId ? "保存中..." : "创建中..."}
                </>
              ) : (
                <>
                  {editingObjectId ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingObjectId ? "保存修改" : "确认创建"}
                </>
              )}
            </AppButton>
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
        <DialogContent className="max-h-[90vh] max-w-lg flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil size={18} />
              编辑模型
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            {/* Replace file zone */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                替换模型文件（可选）
              </label>
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

            {/* Basic info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    模型名称
                  </label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="请输入模型名称"
                    className="h-10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-version"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    版本（可选）
                  </label>
                  <Input
                    id="edit-version"
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    placeholder="v1.0"
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="edit-device-type"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  编码
                </label>
                <Autocomplete
                  value={editCode}
                  onValueChange={(v: string) => setEditCode(v.toUpperCase())}
                  items={existingCodes}
                  openOnInputClick
                  filter={() => true}
                >
                  <AutocompleteInput
                    placeholder="1位字符，如 C"
                    maxLength={1}
                    aria-hidden={false}
                    className="h-10"
                  >
                    <AutocompleteTrigger />
                  </AutocompleteInput>
                  <AutocompletePopup className="z-[100]">
                    <AutocompleteList>
                      {(type: string) => (
                        <AutocompleteItem key={type} value={type}>
                          {type}
                        </AutocompleteItem>
                      )}
                    </AutocompleteList>
                  </AutocompletePopup>
                </Autocomplete>
                <p className="text-xs text-muted-foreground mt-1.5">1 位大写字母，如 C</p>
              </div>
              <div>
                <label
                  htmlFor="edit-description"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  描述（可选）
                </label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="请输入模型描述"
                  className="h-10"
                />
              </div>
            </div>

            {editError && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="h-10 px-5">
              取消
            </Button>
            <AppButton
              level="action"
              onClick={handleSaveEdit}
              disabled={!editName.trim() || !editCode.trim() || isSaving}
              className="h-10 px-5 gap-2"
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
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) resetImport();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload size={18} />
              导入点位
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">导入文件</label>
              <ModelFileZone
                file={importFile}
                onFileSelect={handleImportFileSelect}
                onFileClear={() => {
                  setImportFile(null);
                  setImportError("");
                }}
                acceptedFormats=".json,.csv,.xlsx"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                支持 .json、.csv 或 .xlsx 格式。.xlsx 将按"设备名称"列自动分组创建模型和对象。
              </p>
            </div>

            {importError && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {importError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setImportOpen(false)} className="h-10 px-5">
              取消
            </Button>
            <AppButton
              level="action"
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="h-10 px-5 gap-2"
            >
              {isImporting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  确认导入
                </>
              )}
            </AppButton>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDesc}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => confirmActionRef.current?.()}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
