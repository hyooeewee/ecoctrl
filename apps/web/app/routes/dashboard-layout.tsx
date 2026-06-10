import { useEffect, useRef, useState } from "react";
import { Outlet, useLoaderData, useLocation } from "react-router";
import { X } from "lucide-react";

import { BuildingView, type BuildingViewRef } from "~/components/dashboard/building-view";
import { LoadingOverlay } from "~/components/dashboard/loading-overlay";
import { fetchPublicModel } from "~/lib/model-api";
import type { DashboardModelConfig } from "@ecoctrl/shared";
import { useSettingsStore } from "~/store/settings";
import { useLocale } from "~/locales";

import type { Route } from "./+types/dashboard-layout";

// ========================================
// Types
// ========================================

export interface DashboardOutletContext {
  buildingRef: React.RefObject<BuildingViewRef | null>;
  modelLoaded: boolean;
  activeLabel: string | null;
  setActiveLabel: (key: string | null) => void;
}

// ========================================
// Constants
// ========================================

const SIDEBAR_W = 320;

// ========================================
// Label info sidebar
// ========================================

function LabelInfoPanel({ labelKey, onClose }: { labelKey: string; onClose: () => void }) {
  const t = useLocale();
  const info = t.labelInfo[labelKey as keyof typeof t.labelInfo];
  if (!info) return null;

  return (
    <div
      className="absolute top-0 bottom-0 left-0 z-30 flex flex-col border-r border-white/10 bg-black/80 backdrop-blur-md transition-transform duration-300 ease-out pointer-events-auto"
      style={{ width: SIDEBAR_W }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{info.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-foreground/60 hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground text-xs leading-relaxed">{info.description}</p>
      </div>
    </div>
  );
}

// ========================================
// Loader
// ========================================

export async function clientLoader(): Promise<{
  model: DashboardModelConfig | null;
}> {
  const model = await fetchPublicModel().catch((err) => {
    console.error("[dashboard-layout clientLoader] fetchPublicModel failed:", err);
    return null;
  });
  return { model };
}

export function HydrateFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#060d18]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyber-cyan border-t-transparent" />
    </div>
  );
}

// ========================================
// Layout
// ========================================

export default function DashboardLayout() {
  const { model } = useLoaderData() as {
    model: DashboardModelConfig | null;
  };
  const location = useLocation();
  const showLoadingAnimation = useSettingsStore((s) => s.showLoadingAnimation);

  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const buildingRef = useRef<BuildingViewRef>(null);

  // Reset activeLabel when leaving the home page so other routes
  // do not show an orphaned sidebar or offset viewport.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveLabel(null);
    }
  }, [location.pathname]);

  return (
    <div className="dark text-foreground relative h-screen overflow-hidden font-mono">
      {/* Blueprint loading overlay — covers everything until model is ready */}
      {showLoadingAnimation && !modelLoaded && <LoadingOverlay progress={modelLoadProgress} />}

      {/* Full-page 3D building background */}
      <BuildingView
        ref={buildingRef}
        className="absolute inset-0 z-0 h-full w-full"
        activeLabel={activeLabel}
        sidebarWidth={activeLabel ? SIDEBAR_W : 0}
        onLabelClick={setActiveLabel}
        onCanvasClick={() => setActiveLabel(null)}
        onLoad={() => setModelLoaded(true)}
        onProgress={setModelLoadProgress}
        modelConfig={model ?? undefined}
      />

      {/* Label info sidebar (left panel) */}
      {activeLabel && (
        <LabelInfoPanel labelKey={activeLabel} onClose={() => setActiveLabel(null)} />
      )}

      {/* Route-specific UI overlays */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <Outlet
          context={
            {
              buildingRef,
              modelLoaded,
              activeLabel,
              setActiveLabel,
            } satisfies DashboardOutletContext
          }
        />
      </div>
    </div>
  );
}
