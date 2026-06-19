// ========================================
// Label Configuration Form
// ========================================

import React, { useEffect, useMemo, useState } from "react";
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
} from "@ecoctrl/ui";
import { FileCodeCorner, GripVertical, MapPin, Plus, Trash2, X } from "lucide-react";
import type { Point } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

export interface LabelGroup {
  id: string;
  name: string;
  pointIds: string[];
}

export interface LabelConfig {
  id: string;
  key: string;
  name: string;
  description?: string;
  parentId: string | null;
  position?: { x: number; y: number; z: number };
  meshKeywords?: string[];
  groups?: LabelGroup[];
}

interface LabelConfigFormProps {
  config: LabelConfig;
  parentOptions: { id: string; name: string }[];
  availablePoints?: Point[];
  onChange: (config: LabelConfig) => void;
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
        <PopoverContent
          align="start"
          className="min-w-0 max-w-[260px] p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
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
// JSON Edit Dialog for Groups
// ========================================

interface JsonEditDialogProps {
  groups: LabelGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (groups: LabelGroup[]) => void;
}

function JsonEditDialog({ groups, open, onOpenChange, onConfirm }: JsonEditDialogProps) {
  const [text, setText] = useState(() => JSON.stringify(groups, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(groups, null, 2));
    setError(null);
  }, [groups, open]);

  const handleChange = (value: string) => {
    setText(value);
    setError(null);
  };

  const handleConfirm = () => {
    try {
      const parsed = JSON.parse(text || "[]");
      if (!Array.isArray(parsed)) {
        throw new Error("分组数据必须是数组");
      }
      for (const item of parsed) {
        if (
          typeof item?.id !== "string" ||
          typeof item?.name !== "string" ||
          !Array.isArray(item?.pointIds)
        ) {
          throw new Error("每个分组必须包含 id、name 和 pointIds 数组");
        }
      }
      onConfirm(parsed as LabelGroup[]);
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
          onChange={handleChange}
          title="编辑分组 JSON"
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
// Label Groups Editor
// ========================================

interface LabelGroupsEditorProps {
  groups: LabelGroup[];
  availablePoints: Point[];
  onChange: (groups: LabelGroup[]) => void;
  disabled?: boolean;
}

function LabelGroupsEditor({
  groups,
  availablePoints,
  onChange,
  disabled,
}: LabelGroupsEditorProps) {
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
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

  const updateGroup = (id: string, updates: Partial<LabelGroup>) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const updateGroupName = (id: string, suffix: string) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, name: buildGroupName(suffix, g.id) } : g)));
  };

  const deleteGroup = (id: string) => {
    onChange(normalizeOrder(groups.filter((g) => g.id !== id)));
  };

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

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
            onClick={() => setJsonDialogOpen(true)}
            disabled={disabled}
            title="编辑分组 JSON"
            aria-label="编辑分组 JSON"
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

      <JsonEditDialog
        groups={groups}
        open={jsonDialogOpen}
        onOpenChange={setJsonDialogOpen}
        onConfirm={onChange}
      />

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
              onChange={(pointIds) => updateGroup(group.id, { pointIds })}
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
// Component
// ========================================

export default function LabelConfigForm({
  config,
  parentOptions,
  availablePoints = [],
  onChange,
  onPickPosition,
  disabled,
}: LabelConfigFormProps) {
  const updateField = <K extends keyof LabelConfig>(field: K, value: LabelConfig[K]) => {
    onChange({ ...config, [field]: value });
  };

  const updatePosition = (axis: "x" | "y" | "z", value: string) => {
    const num = parseFloat(value) || 0;
    const current = config.position ?? { x: 0, y: 0, z: 0 };
    onChange({
      ...config,
      position: { ...current, [axis]: num },
    });
  };

  const hasPosition = config.position !== undefined;

  const parentLabel =
    config.parentId === null || config.parentId === "none"
      ? "无 (顶级标签)"
      : (parentOptions.find((o) => o.id === config.parentId)?.name ?? config.parentId);

  return (
    <div className="grid gap-4">
      {/* Key */}
      <div className="grid gap-2">
        <Label htmlFor="label-key" className="text-xs">
          Key *
        </Label>
        <Input
          id="label-key"
          value={config.key}
          onChange={(e) => updateField("key", e.target.value)}
          placeholder="如: transformer_a"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>

      {/* Name */}
      <div className="grid gap-2">
        <Label htmlFor="label-name" className="text-xs">
          名称
        </Label>
        <Input
          id="label-name"
          value={config.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="如: 变压器A相 / 大厅"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="label-desc" className="text-xs">
          描述
        </Label>
        <Input
          id="label-desc"
          value={config.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="可选描述"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>

      {/* Parent */}
      <div className="grid gap-2">
        <Label className="text-xs">父标签</Label>
        <Select
          value={config.parentId ?? "none"}
          onValueChange={(v) => updateField("parentId", v === "none" || v === null ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="无 (顶级标签)">{parentLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">无 (顶级标签)</SelectItem>
            {parentOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Position */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">3D 坐标</Label>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={hasPosition}
              onChange={(e) => {
                if (e.target.checked) {
                  updateField("position", { x: 0, y: 1, z: 0 });
                } else {
                  const next = { ...config };
                  delete next.position;
                  onChange(next);
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
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">X</Label>
                <Input
                  type="number"
                  step="any"
                  value={config.position!.x}
                  onChange={(e) => updatePosition("x", e.target.value)}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Y</Label>
                <Input
                  type="number"
                  step="any"
                  value={config.position!.y}
                  onChange={(e) => updatePosition("y", e.target.value)}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">Z</Label>
                <Input
                  type="number"
                  step="any"
                  value={config.position!.z}
                  onChange={(e) => updatePosition("z", e.target.value)}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mesh Keywords */}
      {hasPosition && (
        <div className="grid gap-2">
          <Label className="text-xs">Mesh 关键词</Label>
          <Input
            value={(config.meshKeywords ?? []).join(", ")}
            onChange={(e) => {
              const keywords = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              updateField("meshKeywords", keywords);
            }}
            placeholder="用逗号分隔，如: shell, casing"
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Point Groups */}
      <LabelGroupsEditor
        groups={config.groups ?? []}
        availablePoints={availablePoints}
        onChange={(groups) => updateField("groups", groups)}
        disabled={disabled}
      />
    </div>
  );
}
