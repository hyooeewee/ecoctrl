import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DashboardModelConfig } from "@ecoctrl/shared";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useSettingsStore } from "~/store/settings";
import { ModelViewer, type VisibilitySnapshot } from "./model-viewer";

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
  enterImmersive: () => void;
  exitImmersive: () => void;
  focusOnLabel: (key: string) => void;
  setClipping: (enabled: boolean) => void;
  executeTagActions: (labelKey: string) => Promise<void>;
  captureVisibilitySnapshot: () => VisibilitySnapshot;
  restoreVisibilitySnapshot: (snapshot: VisibilitySnapshot) => void;
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
    sidebarWidth = 0,
    onLabelClick,
    onCanvasClick: _onCanvasClick,
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
  const loopActiveRef = useRef(false);
  const startLoopRef = useRef<(() => void) | null>(null);
  const stopLoopRef = useRef<(() => void) | null>(null);

  const { showLabels, defaultCameraRadius, environmentPreset } = useSettingsStore();
  const t = useLocale();

  // Track labels from viewer to trigger re-renders when they change.
  const [labelDefs, setLabelDefs] = useState<Array<{ key: string; name: string }>>([]);

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
      onLoad: () => {
        // Update labelDefs state to trigger re-render with actual labels.
        setLabelDefs(viewer.getLabelDefs());
        onLoad?.();
      },
      onLabelsChange: () => {
        // Update labelDefs when background models load and labels change.
        setLabelDefs(viewer.getLabelDefs());
      },
      onProgress,
      defaultCameraRadius,
      sidebarWidth,
    });
    viewerRef.current = viewer;

    const startLoop = () => {
      if (loopActiveRef.current) return;
      loopActiveRef.current = true;

      const projectLabels = () => {
        if (!loopActiveRef.current) return;

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
    };

    const stopLoop = () => {
      loopActiveRef.current = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    startLoopRef.current = startLoop;
    stopLoopRef.current = stopLoop;

    const handleVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else if (showLabels) {
        startLoop();
      }
    };

    if (showLabels) {
      startLoop();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", handleVisibility);
      startLoopRef.current = null;
      stopLoopRef.current = null;
      viewer.dispose();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause/resume the label projection loop when label visibility changes.
  useEffect(() => {
    if (showLabels && !document.hidden) {
      startLoopRef.current?.();
    } else {
      stopLoopRef.current?.();
    }
  }, [showLabels]);

  // Load model when config or URL changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (modelConfig) {
      // V2 multi-model config path.
      const entries = (modelConfig.modelFiles ?? [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
    viewerRef.current?.setShowLabels(showLabels);
  }, [showLabels]);

  useEffect(() => {
    viewerRef.current?.setDefaultCameraRadius(defaultCameraRadius);
  }, [defaultCameraRadius]);

  useEffect(() => {
    if (!viewerRef.current) return;
    viewerRef.current.setEnvironmentPreset(environmentPreset);
  }, [environmentPreset]);

  useEffect(() => {
    viewerRef.current?.setSidebarWidth(sidebarWidth);
  }, [sidebarWidth]);

  // Execute tag operations when a label is selected, restore when deselected.
  const visibilitySnapshotRef = useRef<VisibilitySnapshot | null>(null);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (activeLabel) {
      visibilitySnapshotRef.current = viewer.captureVisibilitySnapshot();
      viewer.executeTagActions(activeLabel);
    } else if (visibilitySnapshotRef.current) {
      viewer.restoreVisibilitySnapshot(visibilitySnapshotRef.current);
      visibilitySnapshotRef.current = null;
      // Reset camera and clipping to default state
      viewer.resetCamera();
      viewer.setClipping(false);
    }
  }, [activeLabel]);

  // Forward imperative methods.
  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => viewerRef.current?.zoomIn(),
      zoomOut: () => viewerRef.current?.zoomOut(),
      resetCamera: () => viewerRef.current?.resetCamera(),
      enterImmersive: () => viewerRef.current?.enterImmersive(),
      exitImmersive: () => viewerRef.current?.exitImmersive(),
      focusOnLabel: (key: string) => viewerRef.current?.focusOnLabel(key),
      setClipping: (enabled: boolean) => viewerRef.current?.setClipping(enabled),
      executeTagActions: (key: string) =>
        viewerRef.current?.executeTagActions(key) ?? Promise.resolve(),
      captureVisibilitySnapshot: () =>
        viewerRef.current?.captureVisibilitySnapshot() ?? { meshes: [] },
      restoreVisibilitySnapshot: (snapshot: VisibilitySnapshot) =>
        viewerRef.current?.restoreVisibilitySnapshot(snapshot),
    }),
    [],
  );

  return (
    <div className={cn("relative overflow-hidden bg-[#060d18]", className)}>
      <canvas
        ref={canvasRef}
        className="h-full touch-none"
        style={{
          width: sidebarWidth ? `calc(100% - ${sidebarWidth}px)` : "100%",
          marginLeft: sidebarWidth,
          transition: "margin-left 0.3s ease, width 0.3s ease",
        }}
        aria-label={t.building.ariaLabel}
      />

      {/* Floating area labels */}
      {labelDefs.map((cfg) => (
        <AreaLabel
          key={cfg.key}
          label={cfg.name ?? labelText[cfg.key] ?? cfg.key}
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
