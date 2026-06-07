import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DashboardModelConfig } from "@ecoctrl/shared";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useSettingsStore } from "~/store/settings";
import { ModelViewer } from "./model-viewer";
import type { ModelViewerRef } from "./model-viewer";

// ========================================
// 3D-projected area label floating pill
// ========================================

interface AreaLabelProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const AreaLabel = forwardRef<HTMLDivElement, AreaLabelProps>(function AreaLabel(
  { label, isActive, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "absolute top-0 left-0 flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm transition-all",
        isActive
          ? "border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          : "border-cyber-cyan/40 bg-panel-dark/90 text-cyan-200/90 hover:border-cyber-cyan hover:bg-cyber-cyan/10 hover:text-cyber-cyan",
      )}
      style={{ willChange: "transform" }}
    >
      <span className="bg-cyber-cyan/70 size-1.5 rounded-full" />
      {label}
    </div>
  );
});

// ========================================
// Ref interface (preserved for consumers)
// ========================================

export interface BuildingViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  ensureCloseUp: (minRadius: number) => void;
  resetToDefaultRadius: () => void;
  focusOnLabel: (key: string) => void;
  setViewportOffset: (px: number) => void;
  setClipping: (enabled: boolean) => void;
}

// ========================================
// Props
// ========================================

interface BuildingViewProps {
  className?: string;
  activeLabel?: string | null;
  sidebarWidth?: number;
  onLabelClick?: (key: string) => void;
  onCanvasClick?: () => void;
  onLoad?: () => void;
  onProgress?: (progress: number) => void;
  modelUrl?: string;
  modelConfig?: DashboardModelConfig;
}

// ========================================
// Component
// ========================================

export const BuildingView = forwardRef<BuildingViewRef, BuildingViewProps>(function BuildingView(
  {
    className,
    activeLabel,
    sidebarWidth = 320,
    onLabelClick,
    onCanvasClick,
    onLoad,
    onProgress,
    modelUrl,
    modelConfig,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<ModelViewer | null>(null);
  const labelElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const lastLabelStateRef = useRef<Record<string, { x: number; y: number; visible: boolean }>>({});
  const rafRef = useRef<number>(0);

  const {
    autoRotate,
    rotateSpeed,
    showLabels,
    glowIntensity,
    defaultCameraRadius,
    defaultRotationY,
  } = useSettingsStore();
  const t = useLocale();

  const labelText: Record<string, string> = {
    office1: t.building.officeArea,
    meeting: t.building.meetingArea,
    dataCenter: t.building.dataCenter,
    exhibition: t.building.exhibitionHall,
    office2: t.building.officeArea,
    lobby: t.building.lobby,
  };

  // Create ModelViewer instance once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewerRef.current) return;

    const viewer = new ModelViewer({
      canvas,
      onLoad,
      onProgress,
      glowIntensity,
      defaultCameraRadius,
      defaultRotationY,
    });
    viewerRef.current = viewer;

    // Start label projection loop.
    const projectLabels = () => {
      const labels = viewer.projectLabels();
      for (const [key, { x, y, visible }] of Object.entries(labels)) {
        const el = labelElsRef.current[key];
        if (!el) continue;

        const last = lastLabelStateRef.current[key];
        if (
          !last ||
          last.visible !== visible ||
          Math.abs(last.x - x) > 1 ||
          Math.abs(last.y - y) > 1
        ) {
          el.style.display = visible ? "flex" : "none";
          el.style.transform = `translate(${x}px, ${y}px)`;
          lastLabelStateRef.current[key] = { x, y, visible };
        }
      }
      rafRef.current = requestAnimationFrame(projectLabels);
    };
    rafRef.current = requestAnimationFrame(projectLabels);

    return () => {
      cancelAnimationFrame(rafRef.current);
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load model when config or URL changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (modelConfig) {
      // V2 multi-model config path.
      const entries = modelConfig.modelFiles ?? [];
      viewer.load({
        groups: entries.length > 0 ? entries : undefined,
        fallbackUrl: modelConfig.modelFileUrl ?? undefined,
        globalLabels: modelConfig.labels,
      });
    } else if (modelUrl) {
      // Backward compat single-model path.
      viewer.load({ fallbackUrl: modelUrl });
    } else {
      // Default fallback.
      viewer.load({});
    }
  }, [modelConfig, modelUrl]);

  // Sync reactive props.
  useEffect(() => {
    viewerRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    viewerRef.current?.setRotateSpeed(rotateSpeed);
  }, [rotateSpeed]);

  useEffect(() => {
    viewerRef.current?.setShowLabels(showLabels);
  }, [showLabels]);

  useEffect(() => {
    viewerRef.current?.setGlowIntensity(glowIntensity);
  }, [glowIntensity]);

  useEffect(() => {
    viewerRef.current?.setDefaultCameraRadius(defaultCameraRadius);
  }, [defaultCameraRadius]);

  useEffect(() => {
    viewerRef.current?.setDefaultRotationY(defaultRotationY);
  }, [defaultRotationY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    viewerRef.current?.setViewportOffset(sidebarWidth > 0 ? sidebarWidth : 0, canvas.clientWidth);
  }, [sidebarWidth]);

  // Forward imperative methods.
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => viewerRef.current?.zoomIn(),
      zoomOut: () => viewerRef.current?.zoomOut(),
      resetCamera: () => viewerRef.current?.resetCamera(),
      ensureCloseUp: (minRadius: number) => viewerRef.current?.ensureCloseUp(minRadius),
      resetToDefaultRadius: () => viewerRef.current?.resetToDefaultRadius(),
      focusOnLabel: (key: string) => viewerRef.current?.focusOnLabel(key),
      setViewportOffset: (px: number) => {
        const canvas = canvasRef.current;
        if (canvas) {
          viewerRef.current?.setViewportOffset(px, canvas.clientWidth);
        }
      },
      setClipping: (enabled: boolean) => viewerRef.current?.setClipping(enabled),
    }),
    [],
  );

  // Get current label definitions for rendering overlay pills.
  const labelDefs = viewerRef.current?.getLabelDefs() ?? [];

  return (
    <div className={cn("relative overflow-hidden bg-[#060d18]", className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        aria-label={t.building.ariaLabel}
      />

      {/* Floating area labels */}
      {labelDefs.map((cfg) => (
        <AreaLabel
          key={cfg.key}
          label={labelText[cfg.key]}
          isActive={activeLabel === cfg.key}
          onClick={() => onLabelClick?.(cfg.key)}
          ref={(el) => {
            labelElsRef.current[cfg.key] = el;
          }}
        />
      ))}
    </div>
  );
});
