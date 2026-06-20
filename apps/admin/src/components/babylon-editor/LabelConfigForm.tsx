// ========================================
// Label Configuration Form v2
// ========================================

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { JsonEditor } from "@/components/workflow-editor/JsonEditor";
import { cn } from "@/lib/utils";
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@ecoctrl/ui";
import { FileCodeCorner, GripVertical, MapPin, Plus, Trash2, X } from "lucide-react";
import type { DashboardModelLabel, LabelGroup } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

type Label = DashboardModelLabel;

interface LabelConfigFormProps {
  label: Label;
  parentOptions: { id: string; name: string }[];
  availablePoints?: { name?: string | null }[];
  availableModelFiles?: { id: string; name?: string; fileKey: string }[];
  onChange: (label: Label) => void;
  onPickPosition?: () => void;
  disabled?: boolean;
}

// ========================================
// Point Multi-Select
// ========================================

interface PointMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
}

function PointMultiSelect({
  values,
  onChange,
  options,
  disabled,
  placeholder = "输入点位名称",
}: PointMultiSelectProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  const addValues = (raw: string) => {
    const newItems = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !values.includes(s));
    if (newItems.length > 0) {
      onChange([...values, ...newItems]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValues(inputValue);
      setInputValue("");
      setOpen(false);
    } else if (e.key === ",") {
      e.preventDefault();
      addValues(inputValue + ",");
      setInputValue("");
    }
  };

  const filteredOptions = useMemo(() => {
    const term = inputValue.trim().toLowerCase();
    return options.filter((o) => !values.includes(o) && (!term || o.toLowerCase().includes(term)));
  }, [inputValue, options, values]);

  const handleSelect = (name: string) => {
    if (!values.includes(name)) {
      onChange([...values, name]);
    }
    setInputValue("");
    setOpen(false);
  };

  const handleRemove = (name: string) => {
    onChange(values.filter((v) => v !== name));
  };

  return (
    <div className="grid gap-1.5">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => (
            <Badge
              key={v}
              variant="secondary"
              className="flex h-5 items-center gap-1 pr-1 text-[10px] font-normal"
            >
              <span className="max-w-[120px] truncate">{v}</span>
              <button
                type="button"
                onClick={() => handleRemove(v)}
                disabled={disabled}
                className="flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label={`移除 ${v}`}
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          nativeButton={false}
          render={
            <Input
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (!open) setOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="h-7 text-xs"
            />
          }
        />
        <PopoverContent align="start" className="min-w-0 max-w-[260px] p-1">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">无匹配点位</div>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {filteredOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className="block w-full truncate rounded-sm px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                  title={name}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ========================================
// Generic Sub-Object JSON Editor
// ========================================

interface SubObjectJsonEditorProps<T> {
  data: T[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: T[]) => void;
  title: string;
  validate?: (item: unknown) => item is T;
}

function SubObjectJsonEditor<T>({
  data,
  open,
  onOpenChange,
  onConfirm,
  title,
  validate,
}: SubObjectJsonEditorProps<T>) {
  const [text, setText] = useState(() => JSON.stringify(data, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(data, null, 2));
    setError(null);
  }, [data, open]);

  const handleConfirm = () => {
    try {
      const parsed = JSON.parse(text || "[]");
      if (!Array.isArray(parsed)) {
        throw new Error("数据必须是数组");
      }
      if (validate) {
        for (const item of parsed) {
          if (!validate(item)) {
            throw new Error("数据格式不正确，请检查每个条目");
          }
        }
      }
      onConfirm(parsed as T[]);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 格式错误");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl overflow-hidden p-0">
        <JsonEditor
          value={text}
          onChange={(v) => {
            setText(v);
            setError(null);
          }}
          title={title}
          mode="inline"
          editor="monaco"
          showHeader
          showFullscreen={false}
          height="320px"
          showFormat
          showCopy
          error={error}
          onCancel={() => onOpenChange(false)}
          onConfirm={handleConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// Groups Editor (Table View)
// ========================================

interface GroupsEditorProps {
  groups: LabelGroup[];
  availablePoints: { name?: string | null }[];
  onChange: (groups: LabelGroup[]) => void;
  onShowJson: () => void;
  disabled?: boolean;
}

function GroupsEditor({
  groups,
  availablePoints,
  onChange,
  onShowJson,
  disabled,
}: GroupsEditorProps) {
  const pointNames = useMemo(
    () => [...new Set(availablePoints.map((p) => p.name).filter((n): n is string => !!n))],
    [availablePoints],
  );

  const parseGroupSuffix = (name: string, id: string) => {
    const prefix = `G${id}_`;
    return name.startsWith(prefix) ? name.slice(prefix.length) : name;
  };

  const buildGroupName = (suffix: string, id: string) => `G${id}_${suffix}`;

  const normalizeOrder = (reordered: LabelGroup[]) =>
    reordered.map((g, i) => {
      const newId = String(i + 1);
      const suffix = parseGroupSuffix(g.name, g.id);
      return { ...g, id: newId, name: buildGroupName(suffix, newId) };
    });

  const addGroup = () => {
    const nextId = String(groups.length + 1);
    onChange([...groups, { id: nextId, name: `G${nextId}_`, pointIds: [] }]);
  };

  const updateGroupName = (id: string, suffix: string) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, name: buildGroupName(suffix, g.id) } : g)));
  };

  const updateGroupPoints = (id: string, pointIds: string[]) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, pointIds } : g)));
  };

  const deleteGroup = (id: string) => {
    onChange(normalizeOrder(groups.filter((g) => g.id !== id)));
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = groups.findIndex((g) => g.id === draggedId);
    const toIndex = groups.findIndex((g) => g.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...groups];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onChange(normalizeOrder(reordered));
    setDraggedId(null);
    setDragOverId(null);
  };
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">点位分组</Label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-7 px-0"
            onClick={onShowJson}
            disabled={disabled}
            title="JSON 编辑"
            aria-label="JSON 编辑"
          >
            <FileCodeCorner size={14} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={addGroup}
            disabled={disabled}
          >
            <Plus size={12} />
            添加分组
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-xs text-muted-foreground">
          暂无分组，点击上方按钮添加
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group, index) => (
          <div
            key={group.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(group.id)}
            onDragOver={(e) => handleDragOver(e, group.id)}
            onDrop={() => handleDrop(group.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "rounded-md border bg-muted/30 p-2 space-y-2 transition-colors",
              dragOverId === group.id && "border-primary/50 bg-primary/5",
              draggedId === group.id && "opacity-50",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex shrink-0 cursor-grab items-center justify-center text-muted-foreground",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                title="拖动排序"
              >
                <GripVertical size={14} />
              </span>
              <InputGroup className="h-7 flex-1" data-disabled={disabled ? "true" : undefined}>
                <InputGroupAddon>
                  <InputGroupText className="text-xs">G{index + 1}_</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  value={parseGroupSuffix(group.name, group.id)}
                  onChange={(e) => updateGroupName(group.id, e.target.value)}
                  placeholder="名称"
                  disabled={disabled}
                  className="text-xs"
                />
              </InputGroup>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteGroup(group.id)}
                disabled={disabled}
                aria-label="删除分组"
              >
                <Trash2 size={12} />
              </Button>
            </div>
            <PointMultiSelect
              values={group.pointIds}
              onChange={(pointIds) => updateGroupPoints(group.id, pointIds)}
              options={pointNames}
              disabled={disabled}
              placeholder="输入点位名称，回车或英文逗号分隔"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Main Form Component
// ========================================

export default function LabelConfigForm({
  label,
  parentOptions,
  availablePoints = [],
  availableModelFiles = [],
  onChange,
  onPickPosition,
  disabled,
}: LabelConfigFormProps) {
  const [groupsJsonOpen, setGroupsJsonOpen] = useState(false);

  const updateMeta = useCallback(
    (field: "name" | "description", value: string) => {
      onChange({ ...label, meta: { ...label.meta, [field]: value } });
    },
    [label, onChange],
  );

  const updateTree = useCallback(
    (field: "parentId" | "order", value: string | number | null) => {
      onChange({ ...label, tree: { ...label.tree, [field]: value } });
    },
    [label, onChange],
  );

  const updateAnchor = useCallback(
    (field: "meshKeywords", value: string[]) => {
      onChange({ ...label, anchor: { ...label.anchor, [field]: value } });
    },
    [label, onChange],
  );

  const updatePosition = useCallback(
    (axis: "x" | "y" | "z", value: string) => {
      const num = parseFloat(value) || 0;
      const current = label.anchor.position ?? { x: 0, y: 0, z: 0 };
      onChange({
        ...label,
        anchor: { ...label.anchor, position: { ...current, [axis]: num } },
      });
    },
    [label, onChange],
  );

  const hasPosition = label.anchor.position !== undefined;

  const parentLabel =
    label.tree.parentId === null || label.tree.parentId === undefined
      ? "无 (顶级标签)"
      : (parentOptions.find((o) => o.id === label.tree.parentId)?.name ?? label.tree.parentId);

  return (
    <Tabs defaultValue="meta" className="w-full">
      <TabsList className="w-full justify-start h-8 gap-0.5 bg-muted/50 p-0.5">
        <TabsTrigger value="meta" className="text-xs h-7 px-2">
          基本信息
        </TabsTrigger>
        <TabsTrigger value="anchor" className="text-xs h-7 px-2">
          3D定位
        </TabsTrigger>
        <TabsTrigger value="tree" className="text-xs h-7 px-2">
          层级
        </TabsTrigger>
        <TabsTrigger value="groups" className="text-xs h-7 px-2">
          点位分组
          {label.groups.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
              {label.groups.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="bindings" className="text-xs h-7 px-2">
          模型
          {label.modelBindings.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-3.5 px-1 text-[9px]">
              {label.modelBindings.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ====== 基本信息 ====== */}
      <TabsContent value="meta" className="mt-3 grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs">ID</Label>
          <Input value={label.meta.id} disabled className="h-8 text-sm bg-muted/50" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="label-name" className="text-xs">
            名称 *
          </Label>
          <Input
            id="label-name"
            value={label.meta.name}
            onChange={(e) => updateMeta("name", e.target.value)}
            placeholder="如: 南序厅"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="label-desc" className="text-xs">
            描述
          </Label>
          <Input
            id="label-desc"
            value={label.meta.description ?? ""}
            onChange={(e) => updateMeta("description", e.target.value)}
            placeholder="可选描述"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </TabsContent>

      {/* ====== 3D 定位 ====== */}
      <TabsContent value="anchor" className="mt-3 grid gap-3">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">3D 坐标</Label>
            <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <input
                type="checkbox"
                checked={hasPosition}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange({
                      ...label,
                      anchor: { ...label.anchor, position: { x: 0, y: 1, z: 0 } },
                    });
                  } else {
                    const { position: _, ...rest } = label.anchor;
                    onChange({ ...label, anchor: rest });
                  }
                }}
                disabled={disabled}
                className="h-3 w-3"
              />
              在 3D 场景中显示
            </label>
          </div>
          {hasPosition && (
            <>
              {onPickPosition && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={onPickPosition}
                  disabled={disabled}
                >
                  <MapPin size={14} />
                  在场景中拾取位置
                </Button>
              )}
              <div className="grid grid-cols-3 gap-2">
                {(["x", "y", "z"] as const).map((axis) => (
                  <div key={axis}>
                    <Label className="text-[10px] text-muted-foreground mb-1 block">
                      {axis.toUpperCase()}
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      value={label.anchor.position![axis]}
                      onChange={(e) => updatePosition(axis, e.target.value)}
                      disabled={disabled}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid gap-2">
          <Label className="text-xs">Mesh 关键词</Label>
          <Input
            value={label.anchor.meshKeywords.join(", ")}
            onChange={(e) => {
              const keywords = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              updateAnchor("meshKeywords", keywords);
            }}
            placeholder="用逗号分隔，如: 南序厅天花板, 南序厅地面"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </TabsContent>

      {/* ====== 层级 ====== */}
      <TabsContent value="tree" className="mt-3 grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs">父标签</Label>
          <Select
            value={label.tree.parentId ?? "none"}
            onValueChange={(v) => updateTree("parentId", v === "none" ? null : v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="无 (顶级标签)">{parentLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无 (顶级标签)</SelectItem>
              {parentOptions
                .filter((o) => o.id !== label.meta.id)
                .map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">排序</Label>
          <Input
            type="number"
            value={label.tree.order}
            onChange={(e) => updateTree("order", parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </TabsContent>

      {/* ====== 点位分组 ====== */}
      <TabsContent value="groups" className="mt-3">
        <GroupsEditor
          groups={label.groups}
          availablePoints={availablePoints}
          onChange={(groups) => onChange({ ...label, groups })}
          onShowJson={() => setGroupsJsonOpen(true)}
          disabled={disabled}
        />
        <SubObjectJsonEditor
          data={label.groups}
          open={groupsJsonOpen}
          onOpenChange={setGroupsJsonOpen}
          onConfirm={(groups) => onChange({ ...label, groups: groups as LabelGroup[] })}
          title="编辑点位分组 JSON"
          validate={(item): item is LabelGroup =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "name" in item &&
            "pointIds" in item
          }
        />
      </TabsContent>

      {/* ====== 模型绑定 ====== */}
      <TabsContent value="bindings" className="mt-3 grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs">关联模型</Label>
          <p className="text-[10px] text-muted-foreground">
            选择此标签关联的模型文件。不选 = 场景标签（始终显示）。
          </p>
          {availableModelFiles.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-xs text-muted-foreground">
              暂无模型文件，请先上传
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableModelFiles.map((mf) => {
                const isChecked = label.modelBindings.includes(mf.id);
                const displayName = mf.name || mf.fileKey.split("/").pop() || mf.id;
                return (
                  <label
                    key={mf.id}
                    className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? label.modelBindings.filter((id) => id !== mf.id)
                          : [...label.modelBindings, mf.id];
                        onChange({ ...label, modelBindings: next });
                      }}
                      disabled={disabled}
                      className="h-3 w-3"
                    />
                    {displayName}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
