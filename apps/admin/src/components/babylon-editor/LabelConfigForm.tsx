// ========================================
// Label Configuration Form
// ========================================

import React, { useMemo, useState } from "react";
import {
  Input,
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
} from "@ecoctrl/ui";
import { MapPin, Plus, Trash2, X } from "lucide-react";
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
        <PopoverTrigger asChild>
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
        </PopoverTrigger>
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
  const pointNames = useMemo(
    () => [...new Set(availablePoints.map((p) => p.name).filter((n): n is string => !!n))],
    [availablePoints],
  );

  const addGroup = () => {
    const nextId =
      groups.length > 0 ? Math.max(...groups.map((g) => parseInt(g.id, 10) || 0)) + 1 : 1;
    onChange([
      ...groups,
      {
        id: String(nextId),
        name: `G${nextId}`,
        pointIds: [],
      },
    ]);
  };

  const updateGroup = (id: string, updates: Partial<LabelGroup>) => {
    onChange(groups.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  };

  const deleteGroup = (id: string) => {
    onChange(groups.filter((g) => g.id !== id));
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">点位分组</Label>
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

      {groups.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-2 py-3 text-center text-xs text-muted-foreground">
          暂无分组，点击上方按钮添加
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-md border bg-muted/30 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={group.name}
                onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                placeholder="分组名称"
                disabled={disabled}
                className="h-7 flex-1 text-xs"
              />
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
