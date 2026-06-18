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
import type { LabelOperation } from "@ecoctrl/shared";
import type { ModelFileEntry } from "@ecoctrl/shared";

// ========================================
// Types
// ========================================

interface ActionStepsConfigProps {
  operations: LabelOperation[];
  modelFiles: ModelFileEntry[];
  availableLabels?: { id: string; name: string }[];
  onChange: (operations: LabelOperation[]) => void;
  disabled?: boolean;
}

// ========================================
// Component
// ========================================

export default function ActionStepsConfig({
  operations,
  modelFiles,
  availableLabels = [],
  onChange,
  disabled,
}: ActionStepsConfigProps) {
  const updateStep = (index: number, patch: Partial<LabelOperation>) => {
    const next = operations.map((op, i) =>
      i === index ? ({ ...op, ...patch } as LabelOperation) : op,
    );
    onChange(next);
  };

  const updateStepConfig = (index: number, key: string, value: unknown) => {
    const op = operations[index];
    if (!op) return;
    const nextConfig = { ...(op.config as Record<string, unknown>), [key]: value };
    updateStep(index, { config: nextConfig } as Partial<LabelOperation>);
  };

  const removeStep = (index: number) => {
    onChange(operations.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= operations.length) return;
    const next = [...operations];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    onChange(next);
  };

  const addStep = (type: LabelOperation["type"]) => {
    onChange([
      ...operations,
      { type, targetModelFileId: undefined, config: getDefaultConfig(type) } as LabelOperation,
    ]);
  };

  return (
    <div className="grid gap-4">
      {operations.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 py-6 text-center text-xs text-muted-foreground">
          暂无动作，点击下方按钮添加
        </div>
      )}

      {operations.map((op, index) => {
        const targetModelFileId = (op.targetModelFileId as string | undefined) ?? undefined;
        const targetLabel =
          targetModelFileId === undefined
            ? "整个场景"
            : modelFiles.find((f) => f.id === targetModelFileId)?.name ||
              modelFiles
                .find((f) => f.id === targetModelFileId)
                ?.fileKey.split("/")
                .pop() ||
              targetModelFileId;
        return (
          <div key={`${op.type}-${index}`} className="rounded-md border bg-muted/30 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  步骤 {index + 1}
                </Badge>
                <span className="text-sm font-medium">{OPERATION_LABELS[op.type]}</span>
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
                  disabled={disabled || index === operations.length - 1}
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

            <div className="grid gap-3">
              {/* Target model file */}
              <div className="grid gap-2">
                <Label className="text-xs">目标模型文件</Label>
                <Select
                  value={targetModelFileId ?? "__scene__"}
                  onValueChange={(v) => {
                    const nextId: string | undefined =
                      v === "__scene__" || v == null ? undefined : v;
                    updateStep(index, { targetModelFileId: nextId } as Partial<LabelOperation>);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>{targetLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__scene__">整个场景</SelectItem>
                    {modelFiles.map((file) => (
                      <SelectItem key={file.id} value={file.id}>
                        {file.name || file.fileKey.split("/").pop() || file.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type-specific config */}
              {op.type === "camera" && (
                <CameraConfig
                  config={op.config}
                  onChange={(k, v) => updateStepConfig(index, k, v)}
                  disabled={disabled}
                />
              )}
              {op.type === "clipping" && (
                <ClippingConfig
                  config={op.config}
                  availableLabels={availableLabels}
                  onChange={(k, v) => updateStepConfig(index, k, v)}
                  disabled={disabled}
                />
              )}
              {op.type === "visibility" && (
                <VisibilityConfig
                  config={op.config}
                  onChange={(k, v) => updateStepConfig(index, k, v)}
                  disabled={disabled}
                />
              )}
              {op.type === "postprocess" && (
                <PostProcessConfig
                  config={op.config}
                  onChange={(k, v) => updateStepConfig(index, k, v)}
                  disabled={disabled}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Add step */}
      <div className="flex items-center gap-2">
        <Select onValueChange={(v) => addStep(v as LabelOperation["type"])} disabled={disabled}>
          <SelectTrigger className="h-9 flex-1 text-sm">
            <SelectValue placeholder="添加动作步骤..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="camera">📷 摄像机动画</SelectItem>
            <SelectItem value="clipping">✂️ 剖切效果</SelectItem>
            <SelectItem value="visibility">👁️ 可见性控制</SelectItem>
            <SelectItem value="postprocess">🎨 后期效果</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ========================================
// Labels
// ========================================

const OPERATION_LABELS: Record<LabelOperation["type"], string> = {
  camera: "摄像机动画",
  clipping: "剖切效果",
  visibility: "可见性控制",
  postprocess: "后期效果",
};

const EASING_LABELS: Record<string, string> = {
  linear: "线性",
  easeIn: "缓入",
  easeOut: "缓出",
  easeInOut: "缓入缓出",
};

const ACTION_LABELS: Record<string, string> = {
  show: "显示",
  hide: "隐藏",
  toggle: "切换",
};

const EFFECT_LABELS: Record<string, string> = {
  exposure: "曝光",
  tone: "色调",
  bloom: "泛光",
  vignette: "暗角",
  depthOfField: "景深",
};

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
              <SelectValue>
                {EASING_LABELS[(config.easing as string) ?? "easeInOut"] ??
                  (config.easing as string)}
              </SelectValue>
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
          {revealIds.map((id) => {
            const labelName = availableLabels.find((l) => l.id === id)?.name;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {labelName || id}
                <button
                  type="button"
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  onClick={() => removeRevealId(id)}
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
            if (typeof v === "string") addRevealId(v);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="添加标签..." />
          </SelectTrigger>
          <SelectContent>
            {availableLabels
              .filter((l) => !revealIds.includes(l.id))
              .map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name || l.id}
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
              <SelectValue>
                {ACTION_LABELS[(config.action as string) ?? "show"] ?? (config.action as string)}
              </SelectValue>
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
            <SelectValue>
              {EFFECT_LABELS[(config.effect as string) ?? "exposure"] ?? (config.effect as string)}
            </SelectValue>
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

function getDefaultConfig(type: LabelOperation["type"]): Record<string, unknown> {
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
