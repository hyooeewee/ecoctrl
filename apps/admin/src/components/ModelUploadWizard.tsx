import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Upload,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  FileText,
  Settings,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Button } from "@ecoctrl/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteTrigger,
} from "@ecoctrl/ui/autocomplete";

import ModelFileZone from "./ModelFileZone";
import { modelsApi } from "../api/models";
import type { PointItem } from "../types";

interface ModelUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDeviceTypes: string[];
  existingPointTypes: string[];
  onSuccess: () => void;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "GLTF (zip)",
  obj: "OBJ",
  fbx: "FBX",
};

function getNextPointNo(points: PointItem[]): string {
  const nos = points.map((p) => parseInt(p.pointNo, 10)).filter((n) => !isNaN(n));
  const max = nos.length > 0 ? Math.max(...nos) : -1;
  return String(max + 1).padStart(4, "0");
}

export default function ModelUploadWizard({
  open,
  onOpenChange,
  existingDeviceTypes,
  existingPointTypes,
  onSuccess,
}: ModelUploadWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1 state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadVersion, setUploadVersion] = useState("v1.0");
  const [uploadDeviceType, setUploadDeviceType] = useState("");

  // Step 2 state
  const [uploadPoints, setUploadPoints] = useState<PointItem[]>([]);
  const [expandedPointIdx, setExpandedPointIdx] = useState<number | null>(null);

  // Common state
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setUploadFile(null);
    setUploadName("");
    setUploadVersion("v1.0");
    setUploadDeviceType(existingDeviceTypes[0] ?? "");
    setUploadPoints([]);
    setExpandedPointIdx(null);
    setUploadError("");
    setIsUploading(false);
  }, [existingDeviceTypes]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  // ── Step 1 handlers ──

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FORMAT_MAP[ext]) {
      setUploadError(`不支持的格式: .${ext}，请上传 .glb/.gltf/.zip/.obj/.fbx 文件`);
      return;
    }
    setUploadFile(file);
    setUploadError("");
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const validateStep1 = (): boolean => {
    if (!uploadName.trim()) {
      setUploadError("模型名称不能为空");
      return false;
    }
    if (!uploadDeviceType.trim()) {
      setUploadError("设备类型不能为空");
      return false;
    }
    return true;
  };

  // ── Step 2 handlers ──

  const addPoint = () => {
    setUploadPoints((prev) => {
      const lastType =
        prev.length > 0 ? prev[prev.length - 1].pointType : (existingPointTypes[0] ?? "");
      const newPoint: PointItem = {
        id: "",
        name: "",
        pointType: lastType,
        pointNo: getNextPointNo(prev),
        props: [],
      };
      return [...prev, newPoint];
    });
    // Auto-expand the new point
    setExpandedPointIdx(uploadPoints.length);
  };

  const removePoint = (index: number) => {
    setUploadPoints((prev) => prev.filter((_, i) => i !== index));
    if (expandedPointIdx === index) {
      setExpandedPointIdx(null);
    } else if (expandedPointIdx !== null && expandedPointIdx > index) {
      setExpandedPointIdx(expandedPointIdx - 1);
    }
  };

  const updatePoint = (index: number, field: keyof PointItem, value: string) => {
    setUploadPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
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

  const validateStep2 = (): boolean => {
    const invalidPoint = uploadPoints.find(
      (p) => p.pointType.trim() && p.pointType.trim().length !== 2,
    );
    if (invalidPoint) {
      setUploadError(`点位类型 "${invalidPoint.pointType}" 必须为 2 位字符`);
      return false;
    }

    const pointKeys = uploadPoints
      .map((p) => `${p.pointType.trim()}_${p.pointNo.trim()}`)
      .filter((k) => k !== "_");
    const dup = pointKeys.find((k, i) => pointKeys.indexOf(k) !== i);
    if (dup) {
      setUploadError(`点位 "${dup}" 重复，请检查`);
      return false;
    }

    return true;
  };

  // ── Step 3 & submit ──

  const handleSubmit = async () => {
    setIsUploading(true);
    setUploadError("");
    try {
      const validPoints = uploadPoints
        .filter((p) => p.pointType.trim())
        .map((p) =>
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
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败，请重试");
      setIsUploading(false);
    }
  };

  // ── Navigation ──

  const goNext = () => {
    setUploadError("");
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const goBack = () => {
    setUploadError("");
    setStep((s) => Math.max(1, s - 1));
  };

  // ── Derived ──

  const totalProps = useMemo(
    () => uploadPoints.reduce((sum, p) => sum + p.props.length, 0),
    [uploadPoints],
  );
  const uniqueTypes = useMemo(
    () => new Set(uploadPoints.map((p) => p.pointType)).size,
    [uploadPoints],
  );

  const canGoNext = step === 1 ? uploadName.trim() && uploadDeviceType.trim() : true;

  // ── Render helpers ──

  const StepIndicator = () => (
    <div className="px-6 pt-5 pb-2">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => {
                if (s < step) {
                  setUploadError("");
                  setStep(s);
                }
              }}
              disabled={s >= step}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "bg-muted text-muted-foreground"
              } ${s < step ? "cursor-pointer" : "cursor-default"}`}
            >
              {s < step ? <CheckCircle size={15} /> : s}
            </button>
            {s < 3 && (
              <div className={`h-0.5 w-10 rounded ${s < step ? "bg-primary/40" : "bg-muted"}`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-10 text-xs">
        <span className={step === 1 ? "font-medium text-foreground" : "text-muted-foreground"}>
          基本信息
        </span>
        <span className={step === 2 ? "font-medium text-foreground" : "text-muted-foreground"}>
          点位配置
        </span>
        <span className={step === 3 ? "font-medium text-foreground" : "text-muted-foreground"}>
          确认上传
        </span>
      </div>
    </div>
  );

  const ErrorBanner = () =>
    uploadError ? (
      <div className="mx-6 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>{uploadError}</span>
      </div>
    ) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-xl flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload size={18} />
            上传数据模型
          </DialogTitle>
        </DialogHeader>

        <StepIndicator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-[320px]">
          <ErrorBanner />

          {/* ═══════ Step 1: Basic Info ═══════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  模型文件（可选）
                </label>
                <ModelFileZone
                  file={uploadFile}
                  onFileSelect={handleFileSelect}
                  onFileClear={() => {
                    setUploadFile(null);
                    setUploadName("");
                  }}
                />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="wz-name"
                      className="text-sm font-medium text-foreground mb-1.5 block"
                    >
                      模型名称
                    </label>
                    <Input
                      id="wz-name"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="请输入模型名称"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wz-version"
                      className="text-sm font-medium text-foreground mb-1.5 block"
                    >
                      版本（可选）
                    </label>
                    <Input
                      id="wz-version"
                      value={uploadVersion}
                      onChange={(e) => setUploadVersion(e.target.value)}
                      placeholder="v1.0"
                      className="h-10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="wz-device-type"
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
                      id="wz-device-type"
                      placeholder="1 位大写字母，如 C"
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
            </div>
          )}

          {/* ═══════ Step 2: Points ═══════ */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium">点位列表</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {uploadPoints.length}
                  </span>
                </div>
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
                <div className="rounded-lg border border-dashed border-border bg-muted/30 py-10 flex flex-col items-center gap-2">
                  <Layers size={24} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">尚未配置点位</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 gap-1"
                    onClick={addPoint}
                  >
                    <Plus size={14} />
                    添加第一个点位
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadPoints.map((point, idx) => {
                    const isExpanded = expandedPointIdx === idx;
                    return (
                      <div
                        key={point.id || `pt-${idx}`}
                        className={`rounded-lg border transition-colors ${
                          isExpanded
                            ? "border-primary/30 bg-card shadow-sm"
                            : "border-border bg-card/50 hover:bg-card"
                        }`}
                      >
                        {/* Header row */}
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                          onClick={() => setExpandedPointIdx(isExpanded ? null : idx)}
                        >
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-mono text-muted-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <span className="w-14 shrink-0 font-mono text-xs">
                            {point.pointType || "—"}
                          </span>
                          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                            {point.pointNo || "—"}
                          </span>
                          <span className="flex-1 min-w-0 text-sm truncate">
                            {point.name || (
                              <span className="text-muted-foreground italic">未命名</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {point.props.length} 属性
                          </span>
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown size={16} className="text-muted-foreground shrink-0" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePoint(idx);
                            }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>

                        {/* Expanded edit area */}
                        {isExpanded && (
                          <div className="border-t px-3 py-3 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-20 shrink-0">
                                <Autocomplete
                                  value={point.pointType}
                                  onValueChange={(v: string) =>
                                    updatePoint(idx, "pointType", v.toUpperCase())
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
                                  onChange={(e) => updatePoint(idx, "pointNo", e.target.value)}
                                  onBlur={() =>
                                    updatePoint(idx, "pointNo", point.pointNo.padStart(4, "0"))
                                  }
                                  placeholder="编号"
                                  className="h-9 text-sm text-center font-mono"
                                  maxLength={4}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <Input
                                  value={point.name}
                                  onChange={(e) => updatePoint(idx, "name", e.target.value)}
                                  placeholder="点位名称（可选）"
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>

                            {/* Props */}
                            <div className="rounded-md bg-muted/50 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground">
                                  属性定义
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 gap-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 px-2"
                                  onClick={() => addProp(idx)}
                                >
                                  <Plus size={12} />
                                  添加
                                </Button>
                              </div>
                              {point.props.length === 0 ? (
                                <p className="text-xs text-muted-foreground/60 py-1">暂无属性</p>
                              ) : (
                                <div className="space-y-2">
                                  {point.props.map((prop, pidx) => (
                                    <div key={pidx} className="flex items-center gap-2">
                                      <Input
                                        value={prop.name}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          updateProp(idx, pidx, "name", val);
                                          updateProp(idx, pidx, "key", val.trim());
                                        }}
                                        placeholder="属性名称"
                                        className="h-8 text-xs flex-1 bg-background"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => removeProp(idx, pidx)}
                                      >
                                        <Trash2 size={12} />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════ Step 3: Review ═══════ */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Settings size={14} />
                    基本信息
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">模型名称</span>
                      <span className="font-medium truncate max-w-[140px]">{uploadName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">版本</span>
                      <span>{uploadVersion || "v1.0"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">设备类型</span>
                      <span className="font-mono">{uploadDeviceType}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <FileText size={14} />
                    模型文件
                  </div>
                  {uploadFile ? (
                    <div className="text-sm">
                      <p className="font-medium truncate">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB /{" "}
                        {FORMAT_MAP[uploadFile.name.split(".").pop()?.toLowerCase() ?? ""] ??
                          "Unknown"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">未上传文件</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3">
                  <Layers size={14} />
                  点位统计
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{uploadPoints.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">点位总数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{totalProps}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">属性总数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{uniqueTypes}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">点位类型</div>
                  </div>
                </div>
              </div>

              {/* Point preview (if any) */}
              {uploadPoints.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                    点位概览
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {uploadPoints.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 text-sm border-t first:border-t-0"
                      >
                        <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                        <span className="w-12 font-mono text-xs">{p.pointType}</span>
                        <span className="w-14 font-mono text-xs text-muted-foreground">
                          {p.pointNo}
                        </span>
                        <span className="flex-1 truncate">{p.name || "未命名"}</span>
                        <span className="text-xs text-muted-foreground">{p.props.length} 属性</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) {
                onOpenChange(false);
              } else {
                goBack();
              }
            }}
            className="h-10 px-5"
          >
            {step === 1 ? "取消" : "上一步"}
          </Button>

          {step < 3 ? (
            <Button onClick={goNext} disabled={!canGoNext} className="h-10 px-5 gap-2">
              下一步
              <ChevronDown size={16} className="-rotate-90" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isUploading} className="h-10 px-5 gap-2">
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
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
