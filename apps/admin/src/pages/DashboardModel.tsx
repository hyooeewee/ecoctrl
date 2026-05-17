import { MapPin, Tag, Plus, Pencil, Trash2, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui/table";
import { Tabs, TabsContent } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";

import AppButton from "@/components/AppButton";
import { useAppStore } from "@/store/appStore";
import type {
  DashboardModelConfig,
  DashboardModelHotspot,
  DashboardModelLabel,
} from "@ecoctrl/shared";
import { dashboardModelApi } from "../api/dashboardModel";
import ModelFileZone from "@/components/ModelFileZone";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatPos(pos: { x: number; y: number; z: number }): string {
  return `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
}

// --- Mesh keyword input component ---
function MeshKeywordInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addKeyword = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (keywords.includes(trimmed)) return;
    onChange([...keywords, trimmed]);
    setInput("");
  };

  const removeKeyword = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addKeyword();
            }
          }}
          placeholder="输入关键词后按回车添加"
          className="h-9 text-sm"
        />
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={addKeyword}>
          添加
        </Button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <Badge
              key={kw}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1"
              onClick={() => removeKeyword(kw)}
            >
              {kw}
              <X size={12} />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardModel() {
  const [config, setConfig] = useState<DashboardModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const activeTab = useAppStore((state) => state.dashboardModelTab);
  const setActiveTab = useAppStore((state) => state.setDashboardModelTab);

  // Hotspot sheet state
  const [hotspotSheetOpen, setHotspotSheetOpen] = useState(false);
  const [hotspotEditing, setHotspotEditing] = useState<DashboardModelHotspot | null>(null);
  const [hotspotForm, setHotspotForm] = useState({
    name: "",
    x: "",
    y: "",
    z: "",
    radius: "",
    description: "",
    meshKeywords: [] as string[],
  });

  // Label sheet state
  const [labelSheetOpen, setLabelSheetOpen] = useState(false);
  const [labelEditing, setLabelEditing] = useState<DashboardModelLabel | null>(null);
  const [labelForm, setLabelForm] = useState({
    key: "",
    x: "",
    y: "",
    z: "",
    focusAlpha: "",
    focusBeta: "",
    focusRadius: "",
    meshKeywords: [] as string[],
  });

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await dashboardModelApi.get();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const updated = await dashboardModelApi.upload(uploadFile);
      setConfig(updated);
      setUploadFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const saveConfig = async (partial: Partial<DashboardModelConfig>) => {
    setSaving(true);
    try {
      const updated = await dashboardModelApi.update(partial);
      setConfig(updated);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  // --- Hotspot handlers ---
  const openHotspotCreate = () => {
    setHotspotEditing(null);
    setHotspotForm({
      name: "",
      x: "",
      y: "",
      z: "",
      radius: "1",
      description: "",
      meshKeywords: [],
    });
    setHotspotSheetOpen(true);
  };

  const openHotspotEdit = (h: DashboardModelHotspot) => {
    setHotspotEditing(h);
    setHotspotForm({
      name: h.name,
      x: String(h.position.x),
      y: String(h.position.y),
      z: String(h.position.z),
      radius: String(h.radius),
      description: h.description,
      meshKeywords: [...h.meshKeywords],
    });
    setHotspotSheetOpen(true);
  };

  const handleHotspotSave = () => {
    if (!hotspotForm.name.trim()) return;
    const position = {
      x: parseFloat(hotspotForm.x) || 0,
      y: parseFloat(hotspotForm.y) || 0,
      z: parseFloat(hotspotForm.z) || 0,
    };
    const hotspot: DashboardModelHotspot = {
      id: hotspotEditing?.id ?? generateId(),
      name: hotspotForm.name.trim(),
      position,
      meshKeywords: hotspotForm.meshKeywords,
      radius: parseFloat(hotspotForm.radius) || 1,
      description: hotspotForm.description.trim(),
    };
    const current = config?.hotspots ?? [];
    let next: DashboardModelHotspot[];
    if (hotspotEditing) {
      next = current.map((h) => (h.id === hotspotEditing.id ? hotspot : h));
    } else {
      next = [...current, hotspot];
    }
    saveConfig({ hotspots: next });
    setHotspotSheetOpen(false);
  };

  const handleHotspotDelete = (id: string, name: string) => {
    setConfirmTitle("确认删除");
    setConfirmDesc(`确定要删除热点 "${name}" 吗？此操作不可撤销。`);
    confirmActionRef.current = () => {
      const next = (config?.hotspots ?? []).filter((h) => h.id !== id);
      saveConfig({ hotspots: next });
      setConfirmOpen(false);
    };
    setConfirmOpen(true);
  };

  // --- Label handlers ---
  const openLabelCreate = () => {
    setLabelEditing(null);
    setLabelForm({
      key: "",
      x: "",
      y: "",
      z: "",
      focusAlpha: "0",
      focusBeta: "0",
      focusRadius: "10",
      meshKeywords: [],
    });
    setLabelSheetOpen(true);
  };

  const openLabelEdit = (l: DashboardModelLabel) => {
    setLabelEditing(l);
    setLabelForm({
      key: l.key,
      x: String(l.fallbackPosition.x),
      y: String(l.fallbackPosition.y),
      z: String(l.fallbackPosition.z),
      focusAlpha: String(l.focusAlpha),
      focusBeta: String(l.focusBeta),
      focusRadius: String(l.focusRadius),
      meshKeywords: [...l.meshKeywords],
    });
    setLabelSheetOpen(true);
  };

  const handleLabelSave = () => {
    if (!labelForm.key.trim()) return;
    const fallbackPosition = {
      x: parseFloat(labelForm.x) || 0,
      y: parseFloat(labelForm.y) || 0,
      z: parseFloat(labelForm.z) || 0,
    };
    const label: DashboardModelLabel = {
      key: labelForm.key.trim(),
      fallbackPosition,
      meshKeywords: labelForm.meshKeywords,
      focusAlpha: parseFloat(labelForm.focusAlpha) || 0,
      focusBeta: parseFloat(labelForm.focusBeta) || 0,
      focusRadius: parseFloat(labelForm.focusRadius) || 10,
    };
    const current = config?.labels ?? [];
    let next: DashboardModelLabel[];
    if (labelEditing) {
      next = current.map((l) => (l.key === labelEditing.key ? label : l));
    } else {
      next = [...current, label];
    }
    saveConfig({ labels: next });
    setLabelSheetOpen(false);
  };

  const handleLabelDelete = (key: string) => {
    setConfirmTitle("确认删除");
    setConfirmDesc(`确定要删除标签 "${key}" 吗？此操作不可撤销。`);
    confirmActionRef.current = () => {
      const next = (config?.labels ?? []).filter((l) => l.key !== key);
      saveConfig({ labels: next });
      setConfirmOpen(false);
    };
    setConfirmOpen(true);
  };

  const existingFileInfo = config?.modelFileUrl
    ? {
        name: config.modelFileUrl.split("/").pop() ?? "未知",
        size: "-",
        format: (config.modelFileUrl.split(".").pop() ?? "").toUpperCase(),
      }
    : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  const hotspots = config?.hotspots ?? [];
  const labels = config?.labels ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Left panel: model upload */}
        <Card className="flex flex-col overflow-hidden border-none shadow-sm lg:col-span-1">
          <CardHeader className="shrink-0 px-6">
            <CardTitle className="text-lg">模型上传与显示</CardTitle>
            <CardDescription>配置大屏首页加载的3D模型文件。</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-6 px-6 pb-6">
            <ModelFileZone
              file={uploadFile}
              existingInfo={existingFileInfo}
              onFileSelect={setUploadFile}
              onFileClear={() => setUploadFile(null)}
              onDeleteExisting={() => {
                setConfirmTitle("确认删除");
                setConfirmDesc("确定要删除当前模型文件吗？此操作不可撤销。");
                confirmActionRef.current = () => {
                  saveConfig({ modelFileUrl: null });
                  setConfirmOpen(false);
                };
                setConfirmOpen(true);
              }}
              acceptedFormats=".glb,.gltf,.obj"
            />

            {uploadFile && (
              <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                {uploading ? "上传中..." : "确认上传"}
              </Button>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">当前模型</span>
                <span className="font-mono text-xs truncate max-w-[180px]">
                  {config?.modelFileUrl?.split("/").pop() ?? "未配置"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预设视角</span>
                <span className="font-mono text-xs">{config?.cameraPreset ?? "--"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">环境光强度</span>
                <span className="font-mono text-xs">{config?.ambientLightIntensity ?? "--"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right panel: tabs */}
        <Card className="flex flex-col overflow-hidden border-none shadow-sm lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
            {/* Hotspots tab */}
            <TabsContent value="hotspots" className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between p-6 pb-4">
                <div>
                  <h3 className="text-sm font-semibold">热点区域</h3>
                  <p className="text-xs text-muted-foreground">管理3D模型上的可交互热点区域。</p>
                </div>
                <AppButton level="action" className="gap-2" onClick={openHotspotCreate}>
                  <Plus size={16} />
                  新增热点
                </AppButton>
              </div>
              <div className="flex-1 overflow-auto px-6 pb-6">
                {hotspots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-16">
                    <MapPin className="h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mt-4 text-sm font-semibold text-foreground">暂无热点配置</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      点击右上角"新增热点"按钮添加。
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">名称</TableHead>
                          <TableHead>位置 (x, y, z)</TableHead>
                          <TableHead className="w-[80px]">半径</TableHead>
                          <TableHead>Mesh关键词</TableHead>
                          <TableHead>描述</TableHead>
                          <TableHead className="w-[100px] text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hotspots.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">{h.name}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs">{formatPos(h.position)}</span>
                            </TableCell>
                            <TableCell>{h.radius}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {h.meshKeywords.map((kw) => (
                                  <Badge key={kw} variant="secondary" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                                {h.meshKeywords.length === 0 && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {h.description || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <AppButton
                                level="ghost"
                                size="icon-sm"
                                className="h-7 w-7 mr-1"
                                onClick={() => openHotspotEdit(h)}
                              >
                                <Pencil size={14} />
                              </AppButton>
                              <AppButton
                                level="danger"
                                size="icon-sm"
                                className="h-7 w-7"
                                onClick={() => handleHotspotDelete(h.id, h.name)}
                              >
                                <Trash2 size={14} />
                              </AppButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Labels tab */}
            <TabsContent value="labels" className="flex-1 flex flex-col overflow-hidden">
              <div className="shrink-0 flex items-center justify-between p-6 pb-4">
                <div>
                  <h3 className="text-sm font-semibold">标签</h3>
                  <p className="text-xs text-muted-foreground">
                    管理3D模型上的标签与相机聚焦配置。
                  </p>
                </div>
                <AppButton level="action" className="gap-2" onClick={openLabelCreate}>
                  <Plus size={16} />
                  新增标签
                </AppButton>
              </div>
              <div className="flex-1 overflow-auto px-6 pb-6">
                {labels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-16">
                    <Tag className="h-12 w-12 text-muted-foreground/40" />
                    <h3 className="mt-4 text-sm font-semibold text-foreground">暂无标签配置</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      点击右上角"新增标签"按钮添加。
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Key</TableHead>
                          <TableHead>位置 (x, y, z)</TableHead>
                          <TableHead>Mesh关键词</TableHead>
                          <TableHead className="w-[180px]">聚焦参数</TableHead>
                          <TableHead className="w-[100px] text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {labels.map((l) => (
                          <TableRow key={l.key}>
                            <TableCell className="font-medium font-mono text-xs">{l.key}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs">
                                {formatPos(l.fallbackPosition)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {l.meshKeywords.map((kw) => (
                                  <Badge key={kw} variant="secondary" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                                {l.meshKeywords.length === 0 && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">
                                α={l.focusAlpha.toFixed(2)} β={l.focusBeta.toFixed(2)} r=
                                {l.focusRadius.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <AppButton
                                level="ghost"
                                size="icon-sm"
                                className="h-7 w-7 mr-1"
                                onClick={() => openLabelEdit(l)}
                              >
                                <Pencil size={14} />
                              </AppButton>
                              <AppButton
                                level="danger"
                                size="icon-sm"
                                className="h-7 w-7"
                                onClick={() => handleLabelDelete(l.key)}
                              >
                                <Trash2 size={14} />
                              </AppButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Hotspot Sheet */}
      <Sheet open={hotspotSheetOpen} onOpenChange={setHotspotSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{hotspotEditing ? "编辑热点" : "新增热点"}</SheetTitle>
            <SheetDescription>
              {hotspotEditing ? "修改热点区域配置信息。" : "添加一个新的3D模型热点区域。"}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="grid space-y-2">
              <Label htmlFor="hs-name">名称 *</Label>
              <Input
                id="hs-name"
                value={hotspotForm.name}
                onChange={(e) => setHotspotForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="如：主变压器A相"
              />
            </div>
            <div className="grid space-y-2">
              <Label>3D 坐标</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">X</Label>
                  <Input
                    type="number"
                    step="any"
                    value={hotspotForm.x}
                    onChange={(e) => setHotspotForm((p) => ({ ...p, x: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Y</Label>
                  <Input
                    type="number"
                    step="any"
                    value={hotspotForm.y}
                    onChange={(e) => setHotspotForm((p) => ({ ...p, y: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Z</Label>
                  <Input
                    type="number"
                    step="any"
                    value={hotspotForm.z}
                    onChange={(e) => setHotspotForm((p) => ({ ...p, z: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="grid space-y-2">
              <Label htmlFor="hs-radius">半径</Label>
              <Input
                id="hs-radius"
                type="number"
                step="any"
                value={hotspotForm.radius}
                onChange={(e) => setHotspotForm((p) => ({ ...p, radius: e.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="grid space-y-2">
              <Label>Mesh 关键词</Label>
              <MeshKeywordInput
                keywords={hotspotForm.meshKeywords}
                onChange={(kws) => setHotspotForm((p) => ({ ...p, meshKeywords: kws }))}
              />
            </div>
            <div className="grid space-y-2">
              <Label htmlFor="hs-desc">描述</Label>
              <Input
                id="hs-desc"
                value={hotspotForm.description}
                onChange={(e) => setHotspotForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="可选描述"
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              type="button"
              className="w-full"
              onClick={handleHotspotSave}
              disabled={!hotspotForm.name.trim() || saving}
            >
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  保存中...
                </>
              ) : (
                <>保存</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Label Sheet */}
      <Sheet open={labelSheetOpen} onOpenChange={setLabelSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{labelEditing ? "编辑标签" : "新增标签"}</SheetTitle>
            <SheetDescription>
              {labelEditing ? "修改标签配置信息。" : "添加一个新的3D模型标签。"}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-5 px-6 py-6">
            <div className="grid space-y-2">
              <Label htmlFor="lbl-key">Key *</Label>
              <Input
                id="lbl-key"
                value={labelForm.key}
                onChange={(e) => setLabelForm((p) => ({ ...p, key: e.target.value }))}
                placeholder="如：transformer_a"
              />
            </div>
            <div className="grid space-y-2">
              <Label>Fallback 位置</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">X</Label>
                  <Input
                    type="number"
                    step="any"
                    value={labelForm.x}
                    onChange={(e) => setLabelForm((p) => ({ ...p, x: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Y</Label>
                  <Input
                    type="number"
                    step="any"
                    value={labelForm.y}
                    onChange={(e) => setLabelForm((p) => ({ ...p, y: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Z</Label>
                  <Input
                    type="number"
                    step="any"
                    value={labelForm.z}
                    onChange={(e) => setLabelForm((p) => ({ ...p, z: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="grid space-y-2">
              <Label>Mesh 关键词</Label>
              <MeshKeywordInput
                keywords={labelForm.meshKeywords}
                onChange={(kws) => setLabelForm((p) => ({ ...p, meshKeywords: kws }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="grid space-y-2">
                <Label htmlFor="lbl-alpha">Focus Alpha</Label>
                <Input
                  id="lbl-alpha"
                  type="number"
                  step="any"
                  value={labelForm.focusAlpha}
                  onChange={(e) => setLabelForm((p) => ({ ...p, focusAlpha: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid space-y-2">
                <Label htmlFor="lbl-beta">Focus Beta</Label>
                <Input
                  id="lbl-beta"
                  type="number"
                  step="any"
                  value={labelForm.focusBeta}
                  onChange={(e) => setLabelForm((p) => ({ ...p, focusBeta: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="grid space-y-2">
                <Label htmlFor="lbl-radius">Focus Radius</Label>
                <Input
                  id="lbl-radius"
                  type="number"
                  step="any"
                  value={labelForm.focusRadius}
                  onChange={(e) => setLabelForm((p) => ({ ...p, focusRadius: e.target.value }))}
                  placeholder="10"
                />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              type="button"
              className="w-full"
              onClick={handleLabelSave}
              disabled={!labelForm.key.trim() || saving}
            >
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  保存中...
                </>
              ) : (
                <>保存</>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
