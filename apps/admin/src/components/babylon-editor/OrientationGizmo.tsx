// ========================================
// CAD-style Orientation Gizmo
// ========================================

import React from "react";

// ========================================
// Types
// ========================================

export interface ViewPreset {
  name: string;
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
}

interface OrientationGizmoProps {
  onPresetSelect: (preset: ViewPreset) => void;
  onCapture: () => void;
}

// ========================================
// Presets
// ========================================

const PRESETS: ViewPreset[] = [
  { name: "顶", position: { x: 0, y: 30, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: "底", position: { x: 0, y: -30, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: "前", position: { x: 0, y: 0, z: -30 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: "后", position: { x: 0, y: 0, z: 30 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: "左", position: { x: -30, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
  { name: "右", position: { x: 30, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
];

const FACE_STYLES: Record<string, { transform: string; label: string; color: string }> = {
  前: { transform: "translateZ(18px)", label: "前", color: "#3b82f6" },
  后: { transform: "rotateY(180deg) translateZ(18px)", label: "后", color: "#6366f1" },
  左: { transform: "rotateY(-90deg) translateZ(18px)", label: "左", color: "#10b981" },
  右: { transform: "rotateY(90deg) translateZ(18px)", label: "右", color: "#f59e0b" },
  顶: { transform: "rotateX(90deg) translateZ(18px)", label: "顶", color: "#ef4444" },
  底: { transform: "rotateX(-90deg) translateZ(18px)", label: "底", color: "#8b5cf6" },
};

// ========================================
// Component
// ========================================

export default function OrientationGizmo({ onPresetSelect, onCapture }: OrientationGizmoProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* 3D Cube */}
      <div
        className="relative"
        style={{
          width: 36,
          height: 36,
          perspective: 120,
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: "rotateX(-25deg) rotateY(35deg)",
          }}
        >
          {Object.entries(FACE_STYLES).map(([name, style]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                const preset = PRESETS.find((p) => p.name === name);
                if (preset) onPresetSelect(preset);
              }}
              title={`${name}视图`}
              className="absolute flex items-center justify-center text-[9px] font-bold text-white cursor-pointer border border-white/30 hover:brightness-125 transition-all"
              style={{
                width: 36,
                height: 36,
                transform: style.transform,
                backgroundColor: style.color + "cc",
                backfaceVisibility: "visible",
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Capture button */}
      <button
        type="button"
        onClick={onCapture}
        className="w-full rounded border border-border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
        title="保存当前摄像机视角"
      >
        📷 捕获视角
      </button>
    </div>
  );
}
