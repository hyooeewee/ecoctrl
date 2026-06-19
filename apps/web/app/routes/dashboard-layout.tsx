import { useEffect, useRef, useState } from "react";
import { Outlet, useLoaderData, useLocation } from "react-router";

import { BuildingView, type BuildingViewRef } from "~/components/dashboard/building-view";
import { LightingSheet } from "~/components/dashboard/lighting-sheet";
import { LoadingOverlay } from "~/components/dashboard/loading-overlay";
import { fetchPublicModel } from "~/lib/model-api";
import type { DashboardModelConfig } from "@ecoctrl/shared";
import { useSettingsStore } from "~/store/settings";

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

      {/* Lighting control sheet (left panel) */}
      {activeLabel && (
        <LightingSheet activeLabel={activeLabel} onClose={() => setActiveLabel(null)} />
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
