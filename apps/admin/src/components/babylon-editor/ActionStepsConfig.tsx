// ========================================
// Action Steps Configuration Component
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
import { X, ChevronUp, ChevronDown } from "lucide-react";
import AppButton from "@/components/AppButton";
import type { LabelAction } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

interface ActionStepsConfigProps {
  actions: LabelAction[];
  availableLabels?: { id: string; name: string }[];
  onChange: (actions: LabelAction[]) => void;
  disabled?: boolean;
}

// ========================================
// Component
// ========================================

export default function ActionStepsConfig({
  actions,
  availableLabels = [],
  onChange,
  disabled,
}: ActionStepsConfigProps) {
  const updateStep = (index: number, patch: Partial<LabelAction>) => {
    const next = actions.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  const updateStepConfig = (index: number, key: string, value: unknown) => {
    const action = actions[index];
    if (!action) return;
    const nextConfig = { ...(action.config as Record<string, unknown>), [key]: value };
    updateStep(index, { config: nextConfig });
  };

  const removeStep = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= actions.length) return;
    const next = [...actions];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    onChange(next);
  };

  const addStep = (label: string) => {
    const type = LABEL_TO_ACTION_TYPE[label];
    if (!type) return;
    const id = `action_${type}_${Date.now()}`;
    onChange([...actions, { id, label: "", type, config: getDefaultConfig(type) }]);
  };

  return (
    <div className="grid gap-4">
      {actions.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 py-6 text-center text-xs text-muted-foreground">
          暂无动作，点击下方按钮添加
        </div>
      )}

      {actions.map((action, index) => (
        <div key={action.id} className="rounded-md border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                步骤 {index + 1}
              </Badge>
              <span className="text-sm font-medium">{ACTION_TYPE_LABELS[action.type]}</span>
              {action.label && (
                <span className="text-xs text-muted-foreground">— {action.label}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <AppButton
                level="ghost"
                size="icon-xs"
                onClick={() => moveStep(index, "up")}
                disabled={disabled || index === 0}
              >
                <ChevronUp size={14} />
              </AppButton>
              <AppButton
                level="ghost"
                size="icon-xs"
                onClick={() => moveStep(index, "down")}
                disabled={disabled || index === actions.length - 1}
              >
                <ChevronDown size={14} />
              </AppButton>
              <AppButton
                level="danger"
                size="icon-xs"
                onClick={() => removeStep(index)}
                disabled={disabled}
              >
                <X size={14} />
              </AppButton>
            </div>
          </div>

          {/* Action label */}
          <div className="grid gap-2 mb-3">
            <Label className="text-xs">动作描述</Label>
            <Input
              value={action.label ?? ""}
              onChange={(e) => updateStep(index, { label: e.target.value })}
              placeholder="如: 飞入南序厅"
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid gap-3">
            {action.type === "camera" && (
              <CameraConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "clipping" && (
              <ClippingConfig
                config={action.config}
                availableLabels={availableLabels}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "visibility" && (
              <VisibilityConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "postprocess" && (
              <PostProcessConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "highlight" && (
              <HighlightConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "explode" && (
              <ExplodeConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "material" && (
              <MaterialConfig
                config={action.config}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
            {action.type === "label" && (
              <LabelControlConfig
                config={action.config}
                availableLabels={availableLabels}
                onChange={(k, v) => updateStepConfig(index, k, v)}
                disabled={disabled}
              />
            )}
          </div>
        </div>
      ))}

      {/* Add step */}
      <div className="flex items-center gap-2">
        <Select onValueChange={addStep} disabled={disabled}>
          <SelectTrigger className="h-9 flex-1 text-sm">
            <SelectValue placeholder="添加动作步骤..." />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ACTION_TYPE_LABELS).map((label) => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ========================================
// Labels
// ========================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  camera: "📷 摄像机动画",
  clipping: "✂️ 剖切效果",
  visibility: "👁️ 可见性控制",
  postprocess: "🎨 后期效果",
  highlight: "✨ 高亮强调",
  explode: "💥 爆炸视图",
  material: "🪨 材质变换",
  label: "🏷️ 标签控制",
};

const LABEL_TO_ACTION_TYPE = Object.fromEntries(
  Object.entries(ACTION_TYPE_LABELS).map(([type, label]) => [label, type]),
) as Record<string, LabelAction["type"]>;

const EASING_OPTIONS: Record<string, string> = {
  linear: "线性",
  easeIn: "缓入",
  easeOut: "缓出",
  easeInOut: "缓入缓出",
};
const EASING_LABEL_TO_VALUE = Object.fromEntries(
  Object.entries(EASING_OPTIONS).map(([v, label]) => [label, v]),
);

const VISIBILITY_ACTION_OPTIONS: Record<string, string> = {
  show: "显示",
  hide: "隐藏",
  toggle: "切换",
};
const VISIBILITY_LABEL_TO_VALUE = Object.fromEntries(
  Object.entries(VISIBILITY_ACTION_OPTIONS).map(([v, label]) => [label, v]),
);

const POSTPROCESS_EFFECT_OPTIONS: Record<string, string> = {
  exposure: "曝光",
  tone: "色调",
  bloom: "泛光",
  vignette: "暗角",
  depthOfField: "景深",
};
const POSTPROCESS_LABEL_TO_VALUE = Object.fromEntries(
  Object.entries(POSTPROCESS_EFFECT_OPTIONS).map(([v, label]) => [label, v]),
);

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
            value={EASING_OPTIONS[(config.easing as string) ?? "easeInOut"] ?? "缓入缓出"}
            onValueChange={(v) => {
              const key = EASING_LABEL_TO_VALUE[v];
              if (key) onChange("easing", key);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EASING_OPTIONS).map(([key, label]) => (
                <SelectItem key={key} value={label}>
                  {label}
                </SelectItem>
              ))}
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
  availableLabels,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  availableLabels: { id: string; name: string }[];
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
          {revealIds.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 pr-1">
              {name}
              <button
                type="button"
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                onClick={() => removeRevealId(name)}
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
            {availableLabels
              .filter((l) => !revealIds.includes(l.name))
              .map((l) => (
                <SelectItem key={l.id} value={l.name}>
                  {l.name}
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
        {((config.action as string) === "hide" || (config.action as string) === "toggle") &&
          targets.length === 0 && (
            <p className="text-xs text-destructive">⚠️ 必须指定目标 Mesh，否则将影响所有对象</p>
          )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">动作</Label>
          <Select
            value={VISIBILITY_ACTION_OPTIONS[(config.action as string) ?? "show"] ?? "显示"}
            onValueChange={(v) => {
              const key = VISIBILITY_LABEL_TO_VALUE[v];
              if (key) onChange("action", key);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VISIBILITY_ACTION_OPTIONS).map(([key, label]) => (
                <SelectItem key={key} value={label}>
                  {label}
                </SelectItem>
              ))}
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
          value={POSTPROCESS_EFFECT_OPTIONS[(config.effect as string) ?? "exposure"] ?? "曝光"}
          onValueChange={(v) => {
            const key = POSTPROCESS_LABEL_TO_VALUE[v];
            if (key) onChange("effect", key);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(POSTPROCESS_EFFECT_OPTIONS).map(([key, label]) => (
              <SelectItem key={key} value={label}>
                {label}
              </SelectItem>
            ))}
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
// Highlight Config
// ========================================

function HighlightConfig({
  config,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const targets = (config.targets as string[]) ?? [];
  const color = (config.color as { r: number; g: number; b: number }) ?? { r: 1, g: 1, b: 0 };

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">目标 Mesh 关键词</Label>
        <Input
          value={targets.join(", ")}
          onChange={(e) => {
            const keywords = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange("targets", keywords);
          }}
          placeholder="用逗号分隔，留空则全部高亮"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">高亮模式</Label>
          <Select
            value={(config.mode as string) ?? "outline"}
            onValueChange={(v) => onChange("mode", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outline">轮廓线</SelectItem>
              <SelectItem value="glow">发光</SelectItem>
              <SelectItem value="color">着色</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">时长 (秒, 0=持续)</Label>
          <Input
            type="number"
            step="0.1"
            value={(config.duration as number) ?? 0}
            onChange={(e) => onChange("duration", parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">颜色</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">R (0-1)</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={color.r}
              onChange={(e) => onChange("color", { ...color, r: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">G (0-1)</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={color.g}
              onChange={(e) => onChange("color", { ...color, g: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">B (0-1)</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={color.b}
              onChange={(e) => onChange("color", { ...color, b: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ========================================
// Explode Config
// ========================================

function ExplodeConfig({
  config,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const axis = (config.axis as { x: number; y: number; z: number }) ?? { x: 0, y: 1, z: 0 };
  const targets = (config.targets as string[]) ?? [];

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">爆炸方向</Label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">X</Label>
            <Input
              type="number"
              step="any"
              value={axis.x}
              onChange={(e) => onChange("axis", { ...axis, x: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Y</Label>
            <Input
              type="number"
              step="any"
              value={axis.y}
              onChange={(e) => onChange("axis", { ...axis, y: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1 block">Z</Label>
            <Input
              type="number"
              step="any"
              value={axis.z}
              onChange={(e) => onChange("axis", { ...axis, z: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label className="text-xs">爆炸距离</Label>
          <Input
            type="number"
            step="any"
            value={(config.distance as number) ?? 2}
            onChange={(e) => onChange("distance", parseFloat(e.target.value) || 2)}
            disabled={disabled}
            className="h-8 text-sm"
          />
        </div>
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
      </div>
      <div className="grid gap-2">
        <Label className="text-xs">目标 Mesh 关键词 (可选)</Label>
        <Input
          value={targets.join(", ")}
          onChange={(e) => {
            const keywords = e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            onChange("targets", keywords);
          }}
          placeholder="用逗号分隔，留空则全部"
          disabled={disabled}
          className="h-8 text-sm"
        />
      </div>
    </>
  );
}

// ========================================
// Material Config
// ========================================

function MaterialConfig({
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
        <Label className="text-xs">目标 Mesh 关键词</Label>
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
          <Label className="text-xs">材质属性</Label>
          <Select
            value={(config.property as string) ?? "opacity"}
            onValueChange={(v) => onChange("property", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opacity">透明度</SelectItem>
              <SelectItem value="emissive">自发光</SelectItem>
              <SelectItem value="wireframe">线框</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs">值</Label>
          {(config.property as string) === "wireframe" ? (
            <Select
              value={(config.value as boolean) ? "true" : "false"}
              onValueChange={(v) => onChange("value", v === "true")}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">开启</SelectItem>
                <SelectItem value="false">关闭</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="number"
              step="0.1"
              min={0}
              max={1}
              value={(config.value as number) ?? 1}
              onChange={(e) => onChange("value", parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="h-8 text-sm"
            />
          )}
        </div>
      </div>
    </>
  );
}

// ========================================
// Label Control Config
// ========================================

function LabelControlConfig({
  config,
  availableLabels,
  onChange,
  disabled,
}: {
  config: Record<string, unknown>;
  availableLabels: { id: string; name: string }[];
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const labelIds = (config.labelIds as string[]) ?? [];
  const addLabelId = (id: string) => {
    if (!labelIds.includes(id)) onChange("labelIds", [...labelIds, id]);
  };
  const removeLabelId = (id: string) => {
    onChange(
      "labelIds",
      labelIds.filter((i) => i !== id),
    );
  };

  return (
    <>
      <div className="grid gap-2">
        <Label className="text-xs">控制动作</Label>
        <Select
          value={(config.action as string) ?? "show"}
          onValueChange={(v) => onChange("action", v)}
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
        <Label className="text-xs">目标标签</Label>
        <div className="flex flex-wrap gap-1">
          {labelIds.map((id) => {
            const label = availableLabels.find((l) => l.id === id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {label?.name ?? id}
                <button
                  type="button"
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  onClick={() => removeLabelId(id)}
                  disabled={disabled}
                >
                  <X size={10} />
                </button>
              </Badge>
            );
          })}
        </div>
        <Select
          onValueChange={(v) => {
            if (typeof v === "string") addLabelId(v);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="添加标签..." />
          </SelectTrigger>
          <SelectContent>
            {availableLabels
              .filter((l) => !labelIds.includes(l.id))
              .map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
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
    case "highlight":
      return {
        targets: [],
        mode: "outline",
        color: { r: 1, g: 1, b: 0 },
        duration: 0,
      };
    case "explode":
      return {
        axis: { x: 0, y: 1, z: 0 },
        distance: 2,
        targets: [],
        duration: 0.8,
        easing: "easeInOut",
      };
    case "material":
      return {
        targets: [],
        property: "opacity",
        value: 0.5,
        duration: 0,
      };
    case "label":
      return {
        labelIds: [],
        action: "show",
      };
  }
}
