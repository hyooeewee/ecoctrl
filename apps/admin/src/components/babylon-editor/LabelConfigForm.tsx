// ========================================
// Label Configuration Form
// ========================================

import React from "react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from "@ecoctrl/ui";
import { MapPin } from "lucide-react";

// ========================================
// Types
// ========================================

export interface LabelConfig {
  id: string;
  key: string;
  name: string;
  description?: string;
  parentId: string | null;
  position?: { x: number; y: number; z: number };
  meshKeywords?: string[];
}

interface LabelConfigFormProps {
  config: LabelConfig;
  parentOptions: { id: string; name: string }[];
  onChange: (config: LabelConfig) => void;
  onPickPosition?: () => void;
  disabled?: boolean;
}

// ========================================
// Component
// ========================================

export default function LabelConfigForm({
  config,
  parentOptions,
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
            <SelectValue placeholder="无 (顶级标签)" />
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
    </div>
  );
}
