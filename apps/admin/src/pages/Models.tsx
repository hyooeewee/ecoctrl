import {
  Box,
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  Pencil,
  Braces,
  Maximize2,
  Minimize2,
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
import { Editor } from "@monaco-editor/react";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import { Label } from "@ecoctrl/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui/tabs";

import AppButton from "@/components/AppButton";
import ModelFileZone from "@/components/ModelFileZone";
import TruncatedText from "@/components/TruncatedText";
import { useAppStore } from "@/store/appStore";
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

function getNextPointNo(points: PointItem[]): string {
  const nos = points.map((p) => parseInt(p.pointNo, 10)).filter((n) => !isNaN(n));
  const max = nos.length > 0 ? Math.max(...nos) : -1;
  return String(max + 1).padStart(4, "0");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? "";
    });
    result.push(obj);
  }

  return result;
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
  const [uploadPoints, setUploadPoints] = useState<PointItem[]>([]);
  const [uploadDeviceType, setUploadDeviceType] = useState("");

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
  const [editDeviceType, setEditDeviceType] = useState("");

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
  const [objectJson, setObjectJson] = useState("");
  const [objectMode, setObjectMode] = useState<"form" | "json">("form");
  const [editingObjectUuid, setEditingObjectUuid] = useState<string | null>(null);
  const [objectFullscreen, setObjectFullscreen] = useState(false);

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetModelId, setImportTargetModelId] = useState("");

  // Points tab state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const activeTab = useAppStore((state) => state.modelsTab);
  const setActiveTab = useAppStore((state) => state.setModelsTab);

  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0] | null
  >(null);

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
    if (!uploadName.trim()) return;
    if (!uploadDeviceType.trim()) {
      setUploadError("设备类型不能为空");
      return;
    }

    // Validate point type length
    const invalidPoint = uploadPoints.find(
      (p) => p.pointType.trim() && p.pointType.trim().length !== 2,
    );
    if (invalidPoint) {
      setUploadError(`点位类型 "${invalidPoint.pointType}" 必须为 2 位字符`);
      return;
    }

    // Validate duplicate point type + number combinations
    const pointKeys = uploadPoints
      .map((p) => `${p.pointType.trim()}_${p.pointNo.trim()}`)
      .filter((k) => k !== "_");
    const dup = pointKeys.find((k, i) => pointKeys.indexOf(k) !== i);
    if (dup) {
      setUploadError(`点位 "${dup}" 重复，请检查`);
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const validPoints = uploadPoints
        .filter((p) => p.pointType.trim())
        .map((p) =>
          // oxlint-disable-next-line oxc/no-map-spread
          Object.assign({}, p, {
            pointType: p.pointType.toUpperCase(),
            pointNo: p.pointNo.padStart(4, "0"),
            props: p.props.filter((prop) => prop.key.trim() || prop.name.trim()),
          }),
        );
      await modelsApi.upload(uploadFile, {
        name: uploadName.trim(),
        version: uploadVersion.trim() || "v1.0",
        deviceType: uploadDeviceType.toUpperCase(),
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
    setUploadDeviceType(existingDeviceTypes[0] ?? "");
  };

  const addPoint = () => {
    setUploadPoints((prev) => {
      const lastType =
        prev.length > 0 ? prev[prev.length - 1].pointType : (existingPointTypes[0] ?? "");
      return [
        ...prev,
        { id: "", name: "", pointType: lastType, pointNo: getNextPointNo(prev), props: [] },
      ];
    });
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
    setObjectMode("form");
    setObjectJson("");
    setEditingObjectUuid(null);
    setObjectFullscreen(false);
  };

  const buildObjectPayload = (): {
    id: string;
    name: string;
    modelId: string;
    modelName: string;
    points: { pointId: string; pointName: string; values: Record<string, string> }[];
  } => {
    const model = models.find((m) => m.id === selectedModelId)!;
    const points =
      (model as Model3D & { points?: PointItem[] }).points?.map((p) => ({
        pointId: `${model.deviceType.toUpperCase()}_${objectId.trim()}_${p.pointType.toUpperCase()}_${p.pointNo.padStart(4, "0")}`,
        pointName: p.name,
        values: objectPointValues[p.id] ?? {},
      })) ?? [];
    return {
      id: objectId.trim(),
      name: objectName.trim(),
      modelId: selectedModelId,
      modelName: model.name,
      points,
    };
  };

  const openEditObjectDialog = (obj: BusinessObject) => {
    setEditingObjectUuid(obj.uuid);
    setObjectId(obj.id);
    setObjectName(obj.name);
    setSelectedModelId(obj.modelId);
    setObjectMode("form");
    setObjectError("");

    // Rebuild objectPointValues from obj.points
    const model = models.find((m) => m.id === obj.modelId);
    const values: Record<string, Record<string, string>> = {};
    if (model) {
      const modelPoints = (model as Model3D & { points?: PointItem[] }).points ?? [];
      for (const mp of modelPoints) {
        const matched = obj.points.find((op) =>
          op.pointId.endsWith(`_${mp.pointType}_${mp.pointNo.padStart(4, "0")}`),
        );
        if (matched && Object.keys(matched.values).length > 0) {
          values[mp.id] = matched.values;
        }
      }
    }
    setObjectPointValues(values);
    setObjectJson("");
    setObjectOpen(true);
  };

  const syncFormToJson = () => {
    if (!objectId.trim() || !objectName.trim() || !selectedModelId) {
      setObjectJson("");
      return;
    }
    try {
      const payload = buildObjectPayload();
      setObjectJson(JSON.stringify(payload, null, 2));
    } catch {
      setObjectJson("");
    }
  };

  const syncJsonToForm = (): string | undefined => {
    if (!objectJson.trim()) return;
    try {
      const parsed = JSON.parse(objectJson) as {
        id?: string;
        name?: string;
        modelId?: string;
        points?: { pointId: string; pointName: string; values: Record<string, string> }[];
      };
      if (parsed.id !== undefined) setObjectId(String(parsed.id));
      if (parsed.name !== undefined) setObjectName(String(parsed.name));
      if (parsed.modelId !== undefined) setSelectedModelId(String(parsed.modelId));
      if (parsed.points) {
        const model = models.find((m) => m.id === (parsed.modelId ?? selectedModelId));
        const values: Record<string, Record<string, string>> = {};
        if (model) {
          const modelPoints = (model as Model3D & { points?: PointItem[] }).points ?? [];
          for (const mp of modelPoints) {
            const suffix = `_${mp.pointType}_${mp.pointNo.padStart(4, "0")}`;
            const matched = parsed.points.find((op) => op.pointId.endsWith(suffix));
            if (matched && Object.keys(matched.values).length > 0) {
              values[mp.id] = matched.values;
            }
          }
        }
        setObjectPointValues(values);
      }
    } catch (e) {
      return e instanceof Error ? e.message : "JSON 格式错误";
    }
  };

  const validateObjectForm = (): boolean => {
    if (!objectId.trim() || !objectName.trim() || !selectedModelId) {
      setObjectError("请填写对象ID、名称并选择模型");
      return false;
    }
    if (!/^\d{4}$/.test(objectId.trim())) {
      setObjectError("设备编号必须为4位数字");
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
    if (!editingObjectUuid) return;
    if (!validateObjectForm()) return;
    setIsCreatingObject(true);
    setObjectError("");
    try {
      const payload = buildObjectPayload();
      await objectsApi.update(editingObjectUuid, payload);
      setObjectOpen(false);
      resetObjectForm();
      await fetchObjects();
    } catch (err) {
      setObjectError(err instanceof Error ? err.message : "保存失败，请重试");
    } finally {
      setIsCreatingObject(false);
    }
  };

  const handleDeleteObject = async (uuid: string, name: string) => {
    if (!window.confirm(`确定要删除业务对象 "${name}" 吗？`)) return;
    try {
      await objectsApi.delete(uuid);
      await fetchObjects();
    } catch (err) {
      console.error(err);
      alert("删除失败，请重试");
    }
  };

  // Import dialog functions
  const handleImportFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "json" && ext !== "csv") {
      setImportError(`不支持的格式: .${ext}，请上传 .json 或 .csv 文件`);
      return;
    }
    setImportFile(file);
    setImportError("");
  };

  const resetImport = () => {
    setImportFile(null);
    setImportError("");
    setImportTargetModelId("");
  };

  const parseImportFile = async (file: File): Promise<PointItem[]> => {
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON 文件必须是对象数组格式");
      }
      return parsed as PointItem[];
    }

    if (ext === "csv") {
      const records = parseCSV(text);
      return records.map((record) => {
        let props: { key: string; name: string; unit?: string }[] = [];
        if (record.props) {
          try {
            props = JSON.parse(record.props);
          } catch {
            props = [];
          }
        }
        return {
          id: record.id ?? "",
          name: record.name ?? "",
          pointType: record.pointType ?? "",
          pointNo: record.pointNo ?? "",
          props,
        } as PointItem;
      });
    }

    throw new Error("不支持的文件格式，请上传 .json 或 .csv 文件");
  };

  const handleImport = async () => {
    if (!importFile) return;
    if (!importTargetModelId) {
      setImportError("请选择目标模型");
      return;
    }

    setIsImporting(true);
    setImportError("");
    try {
      const importedPoints = await parseImportFile(importFile);

      const targetModel = models.find((m) => m.id === importTargetModelId);
      if (!targetModel) {
        throw new Error("所选模型不存在");
      }

      const existingPoints = (targetModel as Model3D & { points?: PointItem[] }).points ?? [];

      // Validate point type length
      const invalidPoint = importedPoints.find(
        (p) => p.pointType.trim() && p.pointType.trim().length !== 2,
      );
      if (invalidPoint) {
        throw new Error(`点位类型 "${invalidPoint.pointType}" 必须为 2 位字符`);
      }

      // Validate duplicate point type + number combinations
      const allPoints = [...existingPoints, ...importedPoints];
      const pointKeys = allPoints
        .map((p) => `${p.pointType.trim()}_${p.pointNo.trim()}`)
        .filter((k) => k !== "_");
      const dup = pointKeys.find((k, i) => pointKeys.indexOf(k) !== i);
      if (dup) {
        throw new Error(`点位 "${dup}" 重复，请检查`);
      }

      // Merge and normalize
      const mergedPoints = allPoints.map((p) =>
        // oxlint-disable-next-line oxc/no-map-spread
        Object.assign({}, p, {
          pointType: p.pointType.toUpperCase(),
          pointNo: p.pointNo.padStart(4, "0"),
          props: p.props.filter((prop) => prop.key.trim() || prop.name.trim()),
        }),
      );

      await modelsApi.update(importTargetModelId, {
        name: targetModel.name,
        version: targetModel.version,
        deviceType: targetModel.deviceType,
        points: mergedPoints,
      });

      setImportOpen(false);
      resetImport();
      await fetchModels();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "导入失败，请重试");
    } finally {
      setIsImporting(false);
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
    setEditDeviceType(model.deviceType);
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
    setEditDeviceType("");
  };

  const handleSaveEdit = async () => {
    if (!editModelId || !editName.trim()) return;
    if (!editDeviceType.trim()) {
      setEditError("设备类型不能为空");
      return;
    }

    // Validate point type length
    const invalidPoint = editPoints.find(
      (p) => p.pointType.trim() && p.pointType.trim().length !== 2,
    );
    if (invalidPoint) {
      setEditError(`点位类型 "${invalidPoint.pointType}" 必须为 2 位字符`);
      return;
    }

    // Validate duplicate point type + number combinations
    const pointKeys = editPoints
      .map((p) => `${p.pointType.trim()}_${p.pointNo.trim()}`)
      .filter((k) => k !== "_");
    const dup = pointKeys.find((k, i) => pointKeys.indexOf(k) !== i);
    if (dup) {
      setEditError(`点位 "${dup}" 重复，请检查`);
      return;
    }

    setIsSaving(true);
    setEditError("");
    try {
      const validPoints = editPoints
        .filter((p) => p.pointType.trim())
        .map((p) =>
          // oxlint-disable-next-line oxc/no-map-spread
          Object.assign({}, p, {
            pointType: p.pointType.toUpperCase(),
            pointNo: p.pointNo.padStart(4, "0"),
            props: p.props.filter((prop) => prop.key.trim() || prop.name.trim()),
          }),
        );

      const updatePayload: {
        name: string;
        version: string;
        deviceType: string;
        points: PointItem[];
        fileUrl?: string | null;
      } = {
        name: editName.trim(),
        version: editVersion.trim() || "v1.0",
        deviceType: editDeviceType.toUpperCase(),
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
    setEditPoints((prev) => {
      const lastType =
        prev.length > 0 ? prev[prev.length - 1].pointType : (existingPointTypes[0] ?? "");
      return [
        ...prev,
        { id: "", name: "", pointType: lastType, pointNo: getNextPointNo(prev), props: [] },
      ];
    });
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

  const existingDeviceTypes = [...new Set(models.map((m) => m.deviceType).filter(Boolean))];
  const existingPointTypes = [
    ...new Set(
      models.flatMap(
        (m) => (m as Model3D & { points?: PointItem[] }).points?.map((p) => p.pointType) ?? [],
      ),
    ),
  ].filter(Boolean);

  // Flatten all points from all models
  const allPoints = useMemo(() => {
    const result: {
      id: string;
      name: string;
      pointType: string;
      pointNo: string;
      propCount: number;
      modelId: string;
      modelName: string;
      deviceType: string;
    }[] = [];

    for (const model of models) {
      const modelPoints = (model as Model3D & { points?: PointItem[] }).points ?? [];
      for (const point of modelPoints) {
        result.push({
          id: point.id,
          name: point.name,
          pointType: point.pointType,
          pointNo: point.pointNo,
          propCount: point.props.length,
          modelId: model.id,
          modelName: model.name,
          deviceType: model.deviceType,
        });
      }
    }
    return result;
  }, [models]);

  const pointColumns = useMemo<ColumnDef<(typeof allPoints)[number]>[]>(
    () => [
      {
        accessorKey: "pointType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            点位类型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("pointType")}</span>,
      },
      {
        accessorKey: "pointNo",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            点位编号
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("pointNo")}</span>,
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
        accessorKey: "modelName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            所属模型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "deviceType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            设备类型
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("deviceType")}</span>,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: allPoints,
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

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsContent value="models" className="mt-0 flex h-full flex-col">
          <Card className="flex h-full flex-col overflow-hidden border-none shadow-sm">
            <CardHeader className="shrink-0 px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>模型资源</CardTitle>
                  <CardDescription>管理已导入的所有 3D 资产模型。</CardDescription>
                </div>
                <AppButton
                  level="action"
                  className="gap-2"
                  onClick={() => {
                    resetUpload();
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
                    点击右上角"上传模型"按钮导入 3D 资产。
                  </p>
                  <AppButton
                    level="action"
                    className="mt-4 gap-2"
                    onClick={() => {
                      resetUpload();
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

        <TabsContent value="objects" className="mt-0 flex h-full flex-col">
          <Card className="flex h-full flex-col overflow-hidden border-none shadow-sm">
            <CardHeader className="shrink-0 px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>业务对象</CardTitle>
                  <CardDescription>基于模型创建业务对象实例，为点位属性赋值。</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-6 pb-6">
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
                          设备编号
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
                        <tr
                          key={obj.uuid}
                          className="border-b border-border/50 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setColumnFilters([{ id: "modelName", value: obj.modelName }]);
                            setActiveTab("points");
                          }}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs">{obj.id}</td>
                          <td className="px-3 py-2.5">{obj.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{obj.modelName}</td>
                          <td className="px-3 py-2.5">{obj.points.length}</td>
                          <td className="px-3 py-2.5 text-right">
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
                                handleDeleteObject(obj.uuid, obj.name);
                              }}
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

        <TabsContent value="points" className="mt-0 flex h-full flex-col">
          <Card className="flex h-full flex-col overflow-hidden border-none shadow-sm">
            <CardHeader className="shrink-0 px-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>点位信息</CardTitle>
                  <CardDescription>查看所有模型中的点位定义信息。</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-6">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : table.getRowModel().rows.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  暂无点位数据
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 py-4">
                    <Input
                      placeholder="筛选点位..."
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      className="max-w-sm"
                    />
                    <Select
                      value={(table.getColumn("modelName")?.getFilterValue() as string) ?? ""}
                      onValueChange={(v) => {
                        table.getColumn("modelName")?.setFilterValue(v || undefined);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="所属模型">
                          {(table.getColumn("modelName")?.getFilterValue() as string | undefined) ??
                            "所属模型"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">全部模型</SelectItem>
                        {models.map((m) => (
                          <SelectItem key={m.id} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={(table.getColumn("deviceType")?.getFilterValue() as string) ?? ""}
                      onValueChange={(v) => {
                        table.getColumn("deviceType")?.setFilterValue(v || undefined);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="设备类型">
                          {(table.getColumn("deviceType")?.getFilterValue() as
                            | string
                            | undefined) ?? "设备类型"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">全部类型</SelectItem>
                        {existingDeviceTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
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
              )}
            </CardContent>
            <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                共 {table.getFilteredRowModel().rows.length} 条
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  下一页
                </Button>
              </div>
            </div>
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
        <DialogContent className="max-h-[90vh] max-w-lg flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload size={18} />
              上传 3D 模型
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            {/* File zone */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                模型文件（可选）
              </label>
              <ModelFileZone
                file={uploadFile}
                onFileSelect={handleUploadFileSelect}
                onFileClear={() => {
                  setUploadFile(null);
                  setUploadName("");
                }}
              />
            </div>

            {/* Basic info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="model-name"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    模型名称
                  </label>
                  <Input
                    id="model-name"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="请输入模型名称"
                    className="h-10"
                  />
                </div>
                <div>
                  <label
                    htmlFor="model-version"
                    className="text-sm font-medium text-foreground mb-1.5 block"
                  >
                    版本（可选）
                  </label>
                  <Input
                    id="model-version"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="v1.0"
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="model-device-type"
                  className="text-sm font-medium text-foreground mb-1.5 block"
                >
                  设备类型
                </label>
                <Autocomplete
                  value={uploadDeviceType}
                  onValueChange={(v: string) => setUploadDeviceType(v.toUpperCase())}
                  items={existingDeviceTypes}
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
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Points */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">点位配置（可选）</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
                  onClick={addPoint}
                >
                  <Plus size={14} />
                  添加点位
                </Button>
              </div>
              {uploadPoints.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 py-6 flex flex-col items-center gap-2">
                  <Layers size={20} className="text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">尚未配置点位</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadPoints.map((point, pointIdx) => (
                    <div
                      key={point.id || `${point.pointType}-${point.pointNo}`}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      {/* Point header */}
                      <div className="flex items-center gap-3">
                        <div className="w-20 shrink-0">
                          <Autocomplete
                            value={point.pointType}
                            onValueChange={(v: string) =>
                              updatePoint(pointIdx, "pointType", v.toUpperCase())
                            }
                            items={existingPointTypes}
                            openOnInputClick
                            filter={() => true}
                          >
                            <AutocompleteInput
                              placeholder="类型"
                              className="h-9 text-sm"
                              maxLength={2}
                              aria-hidden={false}
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
                        </div>
                        <div className="w-24 shrink-0">
                          <Input
                            value={point.pointNo}
                            onChange={(e) => updatePoint(pointIdx, "pointNo", e.target.value)}
                            onBlur={() =>
                              updatePoint(pointIdx, "pointNo", point.pointNo.padStart(4, "0"))
                            }
                            placeholder="编号"
                            className="h-9 text-sm text-center font-mono"
                            maxLength={4}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={point.name}
                            onChange={(e) => updatePoint(pointIdx, "name", e.target.value)}
                            placeholder="点位名称（可选）"
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground/60 hover:text-red-500 hover:bg-red-50"
                          onClick={() => removePoint(pointIdx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Props section */}
                      <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            属性定义
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
                            onClick={() => addProp(pointIdx)}
                          >
                            <Plus size={12} />
                            添加
                          </Button>
                        </div>
                        {point.props.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 py-1">暂无属性</p>
                        ) : (
                          <div className="space-y-2">
                            {point.props.map((prop, propIdx) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <div key={propIdx} className="flex items-center gap-2">
                                <Input
                                  value={prop.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateProp(pointIdx, propIdx, "name", val);
                                    updateProp(pointIdx, propIdx, "key", val.trim());
                                  }}
                                  placeholder="属性名称"
                                  className="h-8 text-xs flex-1 bg-background"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
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
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUploadOpen(false)} className="h-10 px-5">
              取消
            </Button>
            <AppButton
              level="action"
              onClick={handleUpload}
              disabled={!uploadName.trim() || !uploadDeviceType.trim() || isUploading}
              className="h-10 px-5 gap-2"
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
        </DialogContent>
      </Dialog>

      {/* Fullscreen JSON editor overlay */}
      {objectFullscreen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Braces size={18} />
              <h2 className="text-lg font-medium">
                {editingObjectUuid ? "编辑业务对象" : "新增业务对象"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(objectJson);
                    setObjectJson(JSON.stringify(parsed, null, 2));
                    editorRef.current?.getAction("editor.action.formatDocument")?.run();
                  } catch {
                    setObjectError("JSON 格式错误，无法格式化");
                  }
                }}
              >
                <Braces size={14} />
                格式化
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setObjectFullscreen(false);
                  setObjectOpen(true);
                }}
              >
                <Minimize2 size={14} />
                退出全屏
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language="json"
              value={objectJson}
              onChange={(v) => setObjectJson(v ?? "")}
              onMount={(editor) => {
                editorRef.current = editor;
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
              }}
            />
          </div>

          {objectError && (
            <div className="px-6 py-2 border-t border-red-200 bg-red-50 text-sm text-red-700">
              {objectError}
            </div>
          )}

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setObjectFullscreen(false);
                setObjectOpen(false);
              }}
              className="h-10 px-5"
            >
              取消
            </Button>
            <AppButton
              level="action"
              onClick={() => {
                const err = syncJsonToForm();
                if (err) {
                  setObjectError(err);
                  return;
                }
                if (editingObjectUuid) {
                  handleUpdateObject();
                } else {
                  handleCreateObject();
                }
              }}
              disabled={isCreatingObject}
              className="h-10 px-5 gap-2"
            >
              {isCreatingObject ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {editingObjectUuid ? "保存中..." : "创建中..."}
                </>
              ) : (
                <>
                  {editingObjectUuid ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingObjectUuid ? "保存修改" : "确认创建"}
                </>
              )}
            </AppButton>
          </div>
        </div>
      )}

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
              {editingObjectUuid ? <Pencil size={18} /> : <Plus size={18} />}
              {editingObjectUuid ? "编辑业务对象" : "新增业务对象"}
            </DialogTitle>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="px-6 pb-2">
            <Tabs
              value={objectMode}
              onValueChange={(v) => {
                const mode = v as "form" | "json";
                if (mode === "json") {
                  syncFormToJson();
                  setObjectError("");
                  setObjectMode(mode);
                } else {
                  const err = syncJsonToForm();
                  if (err) {
                    setObjectError(err);
                  } else {
                    setObjectError("");
                    setObjectMode(mode);
                  }
                }
              }}
            >
              <TabsList className="flex w-full">
                <TabsTrigger value="form">表单</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            {objectMode === "form" ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      选择模型
                    </label>
                    <Select
                      value={selectedModelId}
                      onValueChange={(v) => setSelectedModelId(v ?? "")}
                    >
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
                        设备编号
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
                </div>

                <div className="border-t border-border" />

                {/* Point values section */}
                {selectedModelId && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">点位属性值</h4>
                    {(() => {
                      const selectedModel = models.find((m) => m.id === selectedModelId);
                      const points =
                        (selectedModel as Model3D & { points?: PointItem[] })?.points ?? [];
                      return points.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-6 flex flex-col items-center gap-2">
                          <Layers size={20} className="text-muted-foreground/40" />
                          <p className="text-xs text-muted-foreground">所选模型未配置点位</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {points.map((point) => (
                            <div
                              key={point.id}
                              className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {point.name || point.id}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {(() => {
                                    const m = models.find((mm) => mm.id === selectedModelId);
                                    return `${m?.deviceType ?? "_"}_${objectId.trim() || "____"}_${point.pointType}_${point.pointNo}`;
                                  })()}
                                </span>
                              </div>
                              {point.props.length === 0 ? (
                                <p className="text-xs text-muted-foreground/60 py-1">无属性</p>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  {point.props.map((prop) => (
                                    <div key={prop.key} className="space-y-1.5">
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
                                        className="h-9 text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">JSON 数据</label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="格式化 JSON"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(objectJson);
                          setObjectJson(JSON.stringify(parsed, null, 2));
                          editorRef.current?.getAction("editor.action.formatDocument")?.run();
                        } catch {
                          setObjectError("JSON 格式错误，无法格式化");
                        }
                      }}
                    >
                      <Braces size={14} />
                    </Button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="全屏编辑"
                      onClick={() => {
                        syncFormToJson();
                        setObjectOpen(false);
                        setObjectFullscreen(true);
                      }}
                    >
                      <Maximize2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Editor
                    height="320px"
                    language="json"
                    value={objectJson}
                    onChange={(v) => setObjectJson(v ?? "")}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                    }}
                  />
                </div>
              </div>
            )}

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
                if (objectMode === "json") {
                  const err = syncJsonToForm();
                  if (err) {
                    setObjectError(err);
                    return;
                  }
                }
                if (editingObjectUuid) {
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
                  {editingObjectUuid ? "保存中..." : "创建中..."}
                </>
              ) : (
                <>
                  {editingObjectUuid ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingObjectUuid ? "保存修改" : "确认创建"}
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
                  设备类型
                </label>
                <Autocomplete
                  value={editDeviceType}
                  onValueChange={(v: string) => setEditDeviceType(v.toUpperCase())}
                  items={existingDeviceTypes}
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
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Points */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">点位配置（可选）</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
                  onClick={addEditPoint}
                >
                  <Plus size={14} />
                  添加点位
                </Button>
              </div>
              {editPoints.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 py-6 flex flex-col items-center gap-2">
                  <Layers size={20} className="text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">尚未配置点位</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editPoints.map((point, pointIdx) => (
                    <div
                      key={point.id || `${point.pointType}-${point.pointNo}`}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
                    >
                      {/* Point header */}
                      <div className="flex items-center gap-3">
                        <div className="w-20 shrink-0">
                          <Autocomplete
                            value={point.pointType}
                            onValueChange={(v: string) =>
                              updateEditPoint(pointIdx, "pointType", v.toUpperCase())
                            }
                            items={existingPointTypes}
                            openOnInputClick
                            filter={() => true}
                          >
                            <AutocompleteInput
                              placeholder="类型"
                              className="h-9 text-sm"
                              maxLength={2}
                              aria-hidden={false}
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
                        </div>
                        <div className="w-24 shrink-0">
                          <Input
                            value={point.pointNo}
                            onChange={(e) => updateEditPoint(pointIdx, "pointNo", e.target.value)}
                            onBlur={() =>
                              updateEditPoint(pointIdx, "pointNo", point.pointNo.padStart(4, "0"))
                            }
                            placeholder="编号"
                            className="h-9 text-sm text-center font-mono"
                            maxLength={4}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={point.name}
                            onChange={(e) => updateEditPoint(pointIdx, "name", e.target.value)}
                            placeholder="点位名称（可选）"
                            className="h-9 text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground/60 hover:text-red-500 hover:bg-red-50"
                          onClick={() => removeEditPoint(pointIdx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>

                      {/* Props section */}
                      <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            属性定义
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
                            onClick={() => addEditProp(pointIdx)}
                          >
                            <Plus size={12} />
                            添加
                          </Button>
                        </div>
                        {point.props.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 py-1">暂无属性</p>
                        ) : (
                          <div className="space-y-2">
                            {point.props.map((prop, propIdx) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <div key={propIdx} className="flex items-center gap-2">
                                <Input
                                  value={prop.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateEditProp(pointIdx, propIdx, "name", val);
                                    updateEditProp(pointIdx, propIdx, "key", val.trim());
                                  }}
                                  placeholder="属性名称"
                                  className="h-8 text-xs flex-1 bg-background"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
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
              disabled={!editName.trim() || !editDeviceType.trim() || isSaving}
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">目标模型</label>
              <Select
                value={importTargetModelId}
                onValueChange={(v) => setImportTargetModelId(v ?? "")}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="请选择要导入点位的模型">
                    {importTargetModelId
                      ? (models.find((m) => m.id === importTargetModelId)?.name ??
                        "请选择要导入点位的模型")
                      : "请选择要导入点位的模型"}
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

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">导入文件</label>
              <ModelFileZone
                file={importFile}
                onFileSelect={handleImportFileSelect}
                onFileClear={() => {
                  setImportFile(null);
                  setImportError("");
                }}
                acceptedFormats=".json,.csv"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                支持 .json（点位数组）或 .csv 格式文件。CSV 需包含 pointType、pointNo、name、props
                列。
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
              disabled={!importFile || !importTargetModelId || isImporting}
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
    </div>
  );
}
