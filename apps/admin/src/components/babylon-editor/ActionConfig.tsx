// ========================================
// Action Configuration Component
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
  Badge,
} from "@ecoctrl/ui";
import { Checkbox } from "@ecoctrl/ui/checkbox";
import { X } from "lucide-react";
import type { LabelAction } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

interface ActionConfigProps {
  actions: LabelAction[];
  availableLabelIds?: string[];
  onChange: (actions: LabelAction[]) => void;
  disabled?: boolean;
}

// ========================================
// Component
// ========================================

export default function ActionConfig({
  actions,
  availableLabelIds = [],
  onChange,
  disabled,
}: ActionConfigProps) {
  const getAction = (type: LabelAction["type"]): LabelAction | undefined => {
    return actions.find((a) => a.type === type);
  };

  const isEnabled = (type: LabelAction["type"]): boolean => {
    return actions.some((a) => a.type === type);
  };

  const toggleAction = (type: LabelAction["type"], enabled: boolean) => {
    const next = actions.filter((a) => a.type !== type);
    if (enabled) {
      const id = `action_${type}_${Date.now()}`;
      next.push({ id, label: "", type, config: getDefaultConfig(type) });
    }
    onChange(next);
  };

  const updateConfig = (type: LabelAction["type"], key: string, value: unknown) => {
    const existing = getAction(type);
    if (!existing) return;

    const updated: LabelAction = {
      ...existing,
      config: { ...existing.config, [key]: value },
    };

    const next = actions.filter((a) => a.type !== type);
    next.push(updated);
    onChange(next);
  };

  return (
    <div className="grid gap-4">
      <h4 className="text-xs font-semibold text-muted-foreground">操作指令</h4>

      {/* Camera Action */}
      <ActionSection
        title="📷 摄像机动画"
        enabled={isEnabled("camera")}
        onToggle={(v) => toggleAction("camera", v)}
        disabled={disabled}
      >
        <CameraConfig
          config={getAction("camera")?.config ?? getDefaultConfig("camera")}
          onChange={(k, v) => updateConfig("camera", k, v)}
          disabled={disabled}
        />
      </ActionSection>

      {/* Clipping Action */}
      <ActionSection
        title="✂️ 剖切效果"
        enabled={isEnabled("clipping")}
        onToggle={(v) => toggleAction("clipping", v)}
        disabled={disabled}
      >
        <ClippingConfig
          config={getAction("clipping")?.config ?? getDefaultConfig("clipping")}
          availableLabelIds={availableLabelIds}
          onChange={(k, v) => updateConfig("clipping", k, v)}
          disabled={disabled}
        />
      </ActionSection>

      {/* Visibility Action */}
      <ActionSection
        title="👁️ 可见性控制"
        enabled={isEnabled("visibility")}
        onToggle={(v) => toggleAction("visibility", v)}
        disabled={disabled}
      >
        <VisibilityConfig
          config={getAction("visibility")?.config ?? getDefaultConfig("visibility")}
          onChange={(k, v) => updateConfig("visibility", k, v)}
          disabled={disabled}
        />
      </ActionSection>

      {/* PostProcess Action */}
      <ActionSection
        title="🎨 后期效果"
        enabled={isEnabled("postprocess")}
        onToggle={(v) => toggleAction("postprocess", v)}
        disabled={disabled}
      >
        <PostProcessConfig
          config={getAction("postprocess")?.config ?? getDefaultConfig("postprocess")}
          onChange={(k, v) => updateConfig("postprocess", k, v)}
          disabled={disabled}
        />
      </ActionSection>
    </div>
  );
}

// ========================================
// Section Wrapper
// ========================================

interface ActionSectionProps {
  title: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ActionSection({ title, enabled, onToggle, disabled, children }: ActionSectionProps) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v: boolean | "indeterminate") => onToggle(v === true)}
          disabled={disabled}
        />
        <span className="text-sm font-medium">{title}</span>
      </div>
      {enabled && <div className="mt-3 grid gap-3">{children}</div>}
    </div>
  );
}

// ========================================
// Camera Config
// ========================================

function CameraConfig({
  config,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const target = (config.target as { x: number; y: number; z: number }) ?? {
    x: 0,
    y: 0,
    z: 0,
  };

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">目标位置</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">X</Label>
            <Input
              type="number"
              step="any"
              value={target.x}
              onChange={(e) =>
                onChange("target", { ...target, x: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Y</Label>
            <Input
              type="number"
              step="any"
              value={target.y}
              onChange={(e) =>
                onChange("target", { ...target, y: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Z</Label>
            <Input
              type="number"
              step="any"
              value={target.z}
              onChange={(e) =>
                onChange("target", { ...target, z: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">距离</Label>
          <Input
            type="number"
            step="any"
            value={(config.distance as number) ?? 5}
            onChange={(e) => onChange("distance", parseFloat(e.target.value) || 5)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">FOV</Label>
          <Input
            type="number"
            step="any"
            value={(config.fov as number) ?? 30}
            onChange={(e) => onChange("fov", parseFloat(e.target.value) || 30)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">时长 (秒)</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.duration as number) ?? 0.8}
            onChange={(e) => onChange("duration", parseFloat(e.target.value) || 0.8)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">缓动</Label>
          <Select
            value={(config.easing as string) ?? "easeInOut"}
            onValueChange={(v) => v && onChange("easing", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">线性</SelectItem>
              <SelectItem value="easeIn">缓入</SelectItem>
              <SelectItem value="easeOut">缓出</SelectItem>
              <SelectItem value="easeInOut">缓入缓出</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

// ========================================
// Clipping Config
// ========================================

function ClippingConfig({
  config,
  availableLabelIds,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  availableLabelIds: string[];
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const normal = (config.planeNormal as { x: number; y: number; z: number }) ?? {
    x: 0,
    y: 1,
    z: 0,
  };
  const revealIds = (config.revealLabelIds as string[]) ?? [];

  const addRevealId = (id: string) => {
    if (!revealIds.includes(id)) {
      onChange("revealLabelIds", [...revealIds, id]);
    }
  };

  const removeRevealId = (id: string) => {
    onChange(
      "revealLabelIds",
      revealIds.filter((i) => i !== id),
    );
  };

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">法向量</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">X</Label>
            <Input
              type="number"
              step="any"
              value={normal.x}
              onChange={(e) =>
                onChange("planeNormal", { ...normal, x: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Y</Label>
            <Input
              type="number"
              step="any"
              value={normal.y}
              onChange={(e) =>
                onChange("planeNormal", { ...normal, y: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Z</Label>
            <Input
              type="number"
              step="any"
              value={normal.z}
              onChange={(e) =>
                onChange("planeNormal", { ...normal, z: parseFloat(e.target.value) || 0 })
              }
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">偏移量</Label>
          <Input
            type="number"
            step="any"
            value={(config.planeOffset as number) ?? 0}
            onChange={(e) => onChange("planeOffset", parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">动画时长 (秒)</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.duration as number) ?? 0.5}
            onChange={(e) => onChange("duration", parseFloat(e.target.value) || 0.5)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Reveal Label IDs */}
      <div className="grid gap-2">
        <Label className="text-xs">剖切后显示的标签</Label>
        <div className="flex flex-wrap gap-1">
          {revealIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {id}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => removeRevealId(id)}
                disabled={disabled}
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
        </div>
        <Select
          onValueChange={(v) => {
            if (typeof v === "string") addRevealId(v);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="添加标签..." />
          </SelectTrigger>
          <SelectContent>
            {availableLabelIds
              .filter((id) => !revealIds.includes(id))
              .map((id) => (
                <SelectItem key={id} value={id}>
                  {id}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// ========================================
// Visibility Config
// ========================================

function VisibilityConfig({
  config,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const targets = (config.targets as string[]) ?? [];

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">Mesh 关键词</Label>
        <Input
          value={targets.join(", ")}
          onChange={(e) => {
            const keywords = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange("targets", keywords);
          }}
          placeholder="用逗号分隔"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">动作</Label>
          <Select
            value={(config.action as string) ?? "show"}
            onValueChange={(v) => v && onChange("action", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="show">显示</SelectItem>
              <SelectItem value="hide">隐藏</SelectItem>
              <SelectItem value="toggle">切换</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">动画时长 (秒)</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.duration as number) ?? 0.3}
            onChange={(e) => onChange("duration", parseFloat(e.target.value) || 0.3)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </>
  );
}

// ========================================
// PostProcess Config
// ========================================

function PostProcessConfig({
  config,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">效果类型</Label>
        <Select
          value={(config.effect as string) ?? "exposure"}
          onValueChange={(v) => v && onChange("effect", v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exposure">曝光</SelectItem>
            <SelectItem value="tone">色调</SelectItem>
            <SelectItem value="bloom">泛光</SelectItem>
            <SelectItem value="vignette">暗角</SelectItem>
            <SelectItem value="depthOfField">景深</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">强度</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.value as number) ?? 1}
            onChange={(e) => onChange("value", parseFloat(e.target.value) || 1)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">动画时长 (秒)</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.duration as number) ?? 0.5}
            onChange={(e) => onChange("duration", parseFloat(e.target.value) || 0.5)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </>
  );
}

// ========================================
// Helpers
// ========================================

function getDefaultConfig(type: LabelAction["type"]): Record<string, unknown> {
  switch (type) {
    case "camera":
      return {
        target: { x: 0, y: 0, z: 0 },
        distance: 5,
        fov: 30,
        duration: 0.8,
        easing: "easeInOut",
      };
    case "clipping":
      return {
        planeNormal: { x: 0, y: 1, z: 0 },
        planeOffset: 0,
        duration: 0.5,
        revealLabelIds: [],
      };
    case "visibility":
      return {
        targets: [],
        action: "show",
        duration: 0.3,
      };
    case "postprocess":
      return {
        effect: "exposure",
        value: 1,
        duration: 0.5,
      };
  }
}
