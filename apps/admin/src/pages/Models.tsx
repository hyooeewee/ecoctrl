import {
  Box,
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Pencil,
  Braces,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@ecoctrl/ui/dialog";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";

import AppButton from "@/components/AppButton";
import { DataTableColumnHeader } from "@/components/DataTableColumnHeader";
import { DataTablePanel } from "@/components/DataTablePanel";
import TruncatedText from "@/components/TruncatedText";
import { useAppStore } from "@/store/appStore";
import { resolveAssetUrl } from "@/lib/url";
import type { DataModel, Point, BusinessObject } from "@ecoctrl/shared";
import { modelsApi } from "../api/models";
import { objectsApi } from "../api/objects";
import { pointsApi } from "../api/points";
import { toast } from "sonner";
import ModelViewer from "../components/ModelViewer";
import CardModelPreview from "../components/CardModelPreview";
import ModelUploadWizard from "@/components/ModelUploadWizard";
import { PointCreateEditDialog } from "@/components/models/dialogs/PointCreateEditDialog";
import { ObjectCreateEditDialog } from "@/components/models/dialogs/ObjectCreateEditDialog";
import { ModelImportDialog } from "@/components/models/dialogs/ModelImportDialog";
import { ModelEditDialog } from "@/components/models/dialogs/ModelEditDialog";

const CARD_PREVIEW_FORMATS = new Set(["GLB", "GLTF", "GLTF (zip)"]);

export default function Models() {
  const [models, setModels] = useState<DataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewModel, setPreviewModel] = useState<DataModel | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<DataModel | null>(null);

  // Objects tab state
  const [objects, setObjects] = useState<BusinessObject[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [objectOpen, setObjectOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<BusinessObject | null>(null);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmActionRef = useRef<(() => void) | null>(null);

  // Points tab state
  const [allPoints, setAllPoints] = useState<Point[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [pointSearch, setPointSearch] = useState("");

  // Point dialog state (create / edit)
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);

  // Objects tab state
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [objectSearch, setObjectSearch] = useState("");

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
        setObjectSearch(model.name ?? model.code ?? "");
      }
    }

    if (activeTab === "points") {
      const terms: string[] = [];
      if (pendingNav.pointsFilterObjectId) {
        const obj = objects.find((o) => o.id === pendingNav.pointsFilterObjectId);
        if (obj) {
          terms.push(obj.name ?? obj.code ?? "");
        }
      }
      if (pendingNav.pointsFilterModelId) {
        const model = models.find((m) => m.id === pendingNav.pointsFilterModelId);
        if (model) {
          terms.push(model.name ?? model.code ?? "");
        }
      }
      if (terms.length > 0) {
        setPointSearch(terms.join(" "));
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

  const openEditObjectDialog = (obj: BusinessObject) => {
    setEditingObject(obj);
    setObjectOpen(true);
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

  const openEditPointDialog = (point: Point) => {
    setEditingPoint(point);
    setPointDialogOpen(true);
  };

  const handleDeletePoint = (id: string, name: string) => {
    setConfirmTitle("确认删除");
    setConfirmDesc(`确定要删除点位 "${name}" 吗？此操作不可撤销。`);
    confirmActionRef.current = async () => {
      try {
        await pointsApi.delete(id);
        await fetchPoints();
        setConfirmOpen(false);
      } catch (err) {
        console.error(err);
        toast.error("删除失败，请重试");
      }
    };
    setConfirmOpen(true);
  };

  const handleBatchDeleteObjects = () => {
    if (selectedObjectIds.length === 0) return;
    setConfirmTitle("确认批量删除");
    setConfirmDesc(`确定要删除选中的 ${selectedObjectIds.length} 个业务对象吗？此操作不可撤销。`);
    confirmActionRef.current = async () => {
      try {
        await Promise.all(selectedObjectIds.map((id) => objectsApi.delete(id)));
        setSelectedObjectIds([]);
        await fetchObjects();
        setConfirmOpen(false);
        toast.success("批量删除成功");
      } catch (err) {
        console.error(err);
        toast.error("批量删除失败，请重试");
      }
    };
    setConfirmOpen(true);
  };

  const handleBatchDeletePoints = () => {
    if (selectedPointIds.length === 0) return;
    setConfirmTitle("确认批量删除");
    setConfirmDesc(`确定要删除选中的 ${selectedPointIds.length} 个点位吗？此操作不可撤销。`);
    confirmActionRef.current = async () => {
      try {
        await Promise.all(selectedPointIds.map((id) => pointsApi.delete(id)));
        setSelectedPointIds([]);
        await fetchPoints();
        setConfirmOpen(false);
        toast.success("批量删除成功");
      } catch (err) {
        console.error(err);
        toast.error("批量删除失败，请重试");
      }
    };
    setConfirmOpen(true);
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
          <DataTableColumnHeader
            column={column}
            title="点位类型"
            enableFiltering
            filterPlaceholder="筛选类型..."
          />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("type")}</span>,
        filterFn: "includesString",
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="编码"
            enableFiltering
            filterPlaceholder="筛选编码..."
          />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("code")}</span>,
        filterFn: "includesString",
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="点位名称"
            enableFiltering
            filterPlaceholder="筛选名称..."
          />
        ),
        cell: ({ row }) => row.getValue("name") || "-",
        filterFn: "includesString",
      },
      {
        accessorKey: "region",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="分区"
            enableFiltering
            filterPlaceholder="筛选分区..."
          />
        ),
        cell: ({ row }) => row.getValue("region") || "-",
        filterFn: "includesString",
      },
      {
        accessorKey: "system",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="系统"
            enableFiltering
            filterPlaceholder="筛选系统..."
          />
        ),
        cell: ({ row }) => row.getValue("system") || "-",
        filterFn: "includesString",
      },
      {
        accessorKey: "propCount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="属性数量" />,
      },
      {
        accessorKey: "objectName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="关联对象"
            enableFiltering
            filterPlaceholder="筛选对象..."
          />
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
        filterFn: "includesString",
      },
      {
        accessorKey: "modelName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="关联模型"
            enableFiltering
            filterPlaceholder="筛选模型..."
          />
        ),
        filterFn: "includesString",
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
      {
        id: "actions",
        header: () => <span className="text-right block">操作</span>,
        cell: ({ row }) => {
          const point = row.original;
          return (
            <div className="text-right">
              <AppButton
                level="secondary"
                size="icon-sm"
                className="h-7 w-7 mr-1"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditPointDialog(point);
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
                  handleDeletePoint(point.id, point.name ?? point.code);
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
          <DataTableColumnHeader
            column={column}
            title="编码"
            enableFiltering
            filterPlaceholder="筛选编码..."
          />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("code") || "-"}</span>,
        filterFn: "includesString",
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="对象名称"
            enableFiltering
            filterPlaceholder="筛选名称..."
          />
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "modelName",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="关联模型"
            enableFiltering
            filterPlaceholder="筛选模型..."
          />
        ),
        filterFn: "includesString",
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
                  size="lg"
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
                    size="lg"
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
                          <CardModelPreview src={modelsApi.getFileUrl(model.id)} alt={model.name} />
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
                            setEditingModel(model);
                            setEditOpen(true);
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
                size="lg"
                className="mt-4 gap-2"
                onClick={() => {
                  setEditingObject(null);
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
                size="lg"
                className="gap-2"
                onClick={() => {
                  setEditingObject(null);
                  setObjectOpen(true);
                }}
              >
                <Plus size={16} />
                新增对象
              </AppButton>
            }
            data={objectsTableData}
            columns={objectColumns}
            getRowId={(row) => row.id}
            enableRowSelection
            selectedRowIds={selectedObjectIds}
            onSelectionChange={setSelectedObjectIds}
            batchActions={
              <AppButton
                level="danger"
                size="sm"
                className="gap-2"
                onClick={handleBatchDeleteObjects}
              >
                <Trash2 size={14} />
                批量删除
              </AppButton>
            }
            searchValue={objectSearch}
            onSearchChange={setObjectSearch}
            searchPlaceholder="筛选对象..."
            pageSizeOptions={[10, 50, 200]}
            getRowClassName={(row) =>
              highlightedObjectId === row.id ? "bg-blue-50 cursor-pointer" : "cursor-pointer"
            }
            onRowClick={(row) => {
              setPendingNav({
                tab: "points",
                pointsFilterObjectId: row.id,
              });
              setActiveTab("points");
            }}
          />
        </TabsContent>

        <TabsContent value="points" className="mt-0 flex h-full flex-col overflow-hidden">
          <DataTablePanel
            title="点位信息"
            description="查看所有数据模型中的点位定义信息。"
            loading={pointsLoading}
            emptyIcon={<Braces className="h-12 w-12 text-muted-foreground/40" />}
            emptyTitle="暂无点位数据"
            emptyDescription="点击「新建点位」或「导入点位」按钮添加点位。"
            emptyAction={
              <div className="flex items-center gap-2 mt-4">
                <AppButton
                  level="action"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    setEditingPoint(null);
                    setPointDialogOpen(true);
                  }}
                >
                  <Plus size={16} />
                  新建点位
                </AppButton>
                <AppButton
                  level="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={16} />
                  导入点位
                </AppButton>
              </div>
            }
            action={
              <div className="flex items-center gap-2">
                <AppButton
                  level="action"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    setEditingPoint(null);
                    setPointDialogOpen(true);
                  }}
                >
                  <Plus size={16} />
                  新建点位
                </AppButton>
                <AppButton
                  level="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={16} />
                  导入点位
                </AppButton>
              </div>
            }
            data={pointsTableData}
            columns={pointColumns}
            getRowId={(row) => row.id}
            enableRowSelection
            selectedRowIds={selectedPointIds}
            onSelectionChange={setSelectedPointIds}
            batchActions={
              <AppButton
                level="danger"
                size="sm"
                className="gap-2"
                onClick={handleBatchDeletePoints}
              >
                <Trash2 size={14} />
                批量删除
              </AppButton>
            }
            searchValue={pointSearch}
            onSearchChange={setPointSearch}
            searchPlaceholder="筛选点位..."
            pageSizeOptions={[10, 50, 200]}
          />
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

      <ObjectCreateEditDialog
        open={objectOpen}
        onOpenChange={(open) => {
          setObjectOpen(open);
          if (!open) setEditingObject(null);
        }}
        models={models}
        editingObject={editingObject}
        onSuccess={fetchObjects}
      />

      <ModelEditDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingModel(null);
        }}
        model={editingModel}
        existingCodes={existingCodes}
        onSuccess={fetchModels}
      />

      <ModelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={async () => {
          await fetchModels();
          await fetchObjects();
          await fetchPoints();
        }}
      />

      <PointCreateEditDialog
        open={pointDialogOpen}
        onOpenChange={(open) => {
          setPointDialogOpen(open);
          if (!open) setEditingPoint(null);
        }}
        models={models}
        objects={objects}
        allPoints={allPoints}
        editingPoint={editingPoint}
        onSuccess={fetchPoints}
      />

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
                src={modelsApi.getFileUrl(previewModel.id)}
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
