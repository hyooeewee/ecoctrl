import {
  IconArrowBackUp,
  IconCheck,
  IconMaximize,
  IconMinimize,
  IconMinus,
  IconPlus,
  IconReload,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLoaderData } from "react-router";

import { BentoGrid } from "~/components/dashboard/bento-grid";
import { BlueprintLoader } from "~/components/dashboard/blueprint-loader";
import { BuildingView, type BuildingViewRef } from "~/components/dashboard/building-view";
import { DashboardHeader } from "~/components/dashboard/dashboard-header";
import { DashboardNav } from "~/components/dashboard/dashboard-nav";
import { DashboardWidgets } from "~/components/dashboard/widgets";
import { fetchDashboardData, type DashboardData } from "~/lib/dashboard-api";
import { cn } from "~/lib/utils";
import { locale, useLocale } from "~/locales";
import { useSettingsStore, type BentoLayoutItem } from "~/store/settings";

import type { Route } from "./+types/home";

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [{ title: locale.meta.title }, { name: "description", content: locale.meta.description }];
}

// ─── Loader ─────────────────────────────────────────────────────────────────────

export async function clientLoader(): Promise<DashboardData | null> {
  try {
    return await fetchDashboardData();
  } catch {
    return null;
  }
}

// ─── Label info sidebar ─────────────────────────────────────────────────────────

const SIDEBAR_W = 320;

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
          <IconX size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground text-xs leading-relaxed">{info.description}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const t = useLocale();
  const loaderData = useLoaderData() as DashboardData | null;
  const navHideDelay = useSettingsStore((state) => state.navHideDelay);
  const bentoDragEnabled = useSettingsStore((state) => state.bentoDragEnabled);
  const bentoLayout = useSettingsStore((state) => state.bentoLayout);
  const editAutoExitDelay = useSettingsStore((state) => state.editAutoExitDelay);
  const showLoadingAnimation = useSettingsStore((state) => state.showLoadingAnimation);
  const setBentoDragEnabled = useSettingsStore((state) => state.setBentoDragEnabled);
  const setBentoLayout = useSettingsStore((state) => state.setBentoLayout);
  const resetBentoLayout = useSettingsStore((state) => state.resetBentoLayout);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const [navVisible, setNavVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildingRef = useRef<BuildingViewRef>(null);
  const layoutSnapshotRef = useRef<BentoLayoutItem[] | null>(null);
  const hasSnappedRef = useRef(false);

  // Immersive mode is triggered by either fullscreen button or clicking a label.
  const isImmersive = fullscreen || activeLabel !== null;

  const rightmostTopWidget = bentoLayout
    .filter((item) => !item.hidden && item.y <= 4)
    .sort((a, b) => b.x + b.w - (a.x + a.w))[0];

  const colsFromRight = rightmostTopWidget ? 16 - rightmostTopWidget.x + 1 : 0;
  const controlsRight =
    isImmersive || colsFromRight === 0 ? "1rem" : `calc(${(colsFromRight / 16) * 100}% + 1rem)`;

  // Load server settings on mount (non-blocking, server-side priority).
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync backend widget metadata → bentoLayout.
  // Layout (position / size / hidden) now comes directly from the API,
  // which merges dashboard_widgets defaults with user_settings overrides.
  useEffect(() => {
    if (!loaderData?.widgets?.length) return;

    const incomingIds = new Set(loaderData.widgets.map((w) => w.id));
    const currentIds = new Set(bentoLayout.map((l) => l.id));

    // Remove widgets that the backend no longer returns.
    const cleaned = bentoLayout.filter((l) => incomingIds.has(l.id));

    // Use API layout for newly discovered widgets.
    const newItems: BentoLayoutItem[] = [];
    for (const w of loaderData.widgets) {
      if (currentIds.has(w.id)) continue;
      newItems.push({
        id: w.id,
        x: w.layoutX,
        y: w.layoutY,
        w: w.layoutW,
        h: w.layoutH,
        hidden: w.hidden,
      });
    }

    const next = [...cleaned, ...newItems];
    if (bentoLayout.length === 0) {
      setBentoLayout(next);
      return;
    }

    if (cleaned.length !== bentoLayout.length || newItems.length > 0) {
      setBentoLayout(next);
    }
  }, [loaderData, bentoLayout, setBentoLayout]);

  // When a label is selected, animate camera to focus on it.
  // For lobby: enable horizontal cross-section clip plane.
  useEffect(() => {
    if (activeLabel) {
      buildingRef.current?.focusOnLabel(activeLabel);
      buildingRef.current?.setClipping(activeLabel === "lobby");
    } else {
      buildingRef.current?.setClipping(false);
    }
  }, [activeLabel]);

  // Start/reset the auto-hide countdown
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNavVisible(false), navHideDelay);
  }, []);

  // Toggle nav on logo click
  const handleLogoClick = useCallback(() => {
    setNavVisible((prev) => {
      if (!prev) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setNavVisible(false), navHideDelay);
      } else {
        if (timerRef.current) clearTimeout(timerRef.current);
      }
      return !prev;
    });
  }, []);

  // Reset countdown on any user interaction while nav is open
  useEffect(() => {
    if (!navVisible) return;
    window.addEventListener("pointermove", resetTimer);
    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      window.removeEventListener("pointermove", resetTimer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [navVisible, resetTimer]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Capture snapshot only when entering edit mode and layout is ready.
  useEffect(() => {
    if (bentoDragEnabled && bentoLayout.length > 0 && !hasSnappedRef.current) {
      layoutSnapshotRef.current = JSON.parse(JSON.stringify(bentoLayout));
      hasSnappedRef.current = true;
    }
    if (!bentoDragEnabled) {
      hasSnappedRef.current = false;
    }
  }, [bentoDragEnabled, bentoLayout]);

  // Auto-exit edit mode after editAutoExitDelay ms of inactivity.
  useEffect(() => {
    if (!bentoDragEnabled || editAutoExitDelay === 0) return;

    let timer = setTimeout(() => setBentoDragEnabled(false), editAutoExitDelay);

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setBentoDragEnabled(false), editAutoExitDelay);
    };

    window.addEventListener("pointermove", reset);
    window.addEventListener("pointerdown", reset);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", reset);
      window.removeEventListener("pointerdown", reset);
    };
  }, [bentoDragEnabled, editAutoExitDelay, setBentoDragEnabled]);

  return (
    <div className="dark">
      <div className="text-foreground relative h-screen overflow-hidden font-mono">
        {/* Blueprint loading overlay — covers everything until model is ready */}
        {showLoadingAnimation && !modelLoaded && <BlueprintLoader progress={modelLoadProgress} />}

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
        />

        {/* Label info sidebar (left panel) */}
        {activeLabel && (
          <LabelInfoPanel labelKey={activeLabel} onClose={() => setActiveLabel(null)} />
        )}

        {/* Overlay layout — let pointer events pass through to the 3D canvas;
             individual interactive children re-enable events below. */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
          {/* Header */}
          <div className="pointer-events-auto">
            <DashboardHeader onLogoClick={handleLogoClick} navVisible={navVisible} />
          </div>

          {/* Main bento grid layout — cards re-enable events individually */}
          <main className="relative flex min-h-0 flex-1 overflow-hidden">
            <BentoGrid
              className={cn(
                "transition-all duration-300 ease-in-out",
                isImmersive && "opacity-0 pointer-events-none",
              )}
            >
              <DashboardWidgets data={loaderData} />
            </BentoGrid>
          </main>

          {/* Bottom navigation — absolute at bottom, floats above widgets */}
          <div
            className="absolute bottom-0 left-2 right-2 z-20 overflow-hidden transition-all duration-300 ease-in-out pointer-events-auto"
            style={{
              maxHeight: navVisible ? "60px" : "0px",
              opacity: navVisible ? 1 : 0,
            }}
          >
            <DashboardNav />
          </div>

          {/* Floating controls — fullscreen / zoom / reset */}
          <div
            className={cn(
              "absolute top-[72px] z-30 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300 pointer-events-auto",
              (activeLabel !== null || bentoDragEnabled) && "opacity-0 pointer-events-none",
            )}
            style={{ right: controlsRight }}
          >
            <button
              type="button"
              onClick={() => {
                if (!fullscreen) {
                  buildingRef.current?.ensureCloseUp(15);
                } else {
                  buildingRef.current?.resetToDefaultRadius();
                }
                setFullscreen((v) => !v);
              }}
              className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
              title={fullscreen ? t.controls.exitFullscreen : t.controls.fullscreen}
            >
              {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={() => buildingRef.current?.zoomIn()}
              className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
              title={t.controls.zoomIn}
            >
              <IconPlus size={16} />
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={() => buildingRef.current?.zoomOut()}
              className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
              title={t.controls.zoomOut}
            >
              <IconMinus size={16} />
            </button>
            <div className="h-px bg-white/10" />
            <button
              type="button"
              onClick={() => {
                setActiveLabel(null);
                setFullscreen(false);
                buildingRef.current?.resetCamera();
              }}
              className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
              title={t.controls.reset}
            >
              <IconReload size={16} />
            </button>
          </div>

          {/* Edit layout floating toolbar */}
          {bentoDragEnabled && (
            <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-1.5 shadow-lg backdrop-blur-md transition-all pointer-events-auto">
              <button
                type="button"
                onClick={() => setBentoDragEnabled(false)}
                className="text-foreground/80 hover:text-cyber-cyan flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
              >
                <IconCheck size={14} />
                {t.editLayout.done}
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => {
                  if (layoutSnapshotRef.current) {
                    setBentoLayout(layoutSnapshotRef.current);
                  }
                  setBentoDragEnabled(false);
                }}
                className="text-foreground/80 hover:text-cyber-cyan flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
              >
                <IconX size={14} />
                {t.editLayout.cancel}
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => resetBentoLayout()}
                className="text-foreground/80 hover:text-cyber-cyan flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
              >
                <IconArrowBackUp size={14} />
                {t.editLayout.reset}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
