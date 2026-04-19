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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const t = useLocale();
  const loaderData = useLoaderData() as DashboardData | null;
  const navHideDelay = useSettingsStore((state) => state.navHideDelay);
  const bentoDragEnabled = useSettingsStore((state) => state.bentoDragEnabled);
  const bentoLayout = useSettingsStore((state) => state.bentoLayout);
  const editAutoExitDelay = useSettingsStore((state) => state.editAutoExitDelay);
  const setBentoDragEnabled = useSettingsStore((state) => state.setBentoDragEnabled);
  const setBentoLayout = useSettingsStore((state) => state.setBentoLayout);
  const resetBentoLayout = useSettingsStore((state) => state.resetBentoLayout);

  const [navVisible, setNavVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildingRef = useRef<BuildingViewRef>(null);
  const layoutSnapshotRef = useRef<BentoLayoutItem[] | null>(null);

  // Find the leftmost column of any visible widget in the top-right area
  // so we can place controls just to its left with a fixed 1rem margin.
  const rightmostTopWidget = bentoLayout
    .filter((item) => !item.hidden && item.y <= 4)
    .sort((a, b) => b.x - a.x)[0];

  const colsFromRight = rightmostTopWidget ? 16 - rightmostTopWidget.x + 1 : 0;
  const controlsRight = fullscreen || colsFromRight === 0
    ? "1rem"
    : `calc(${(colsFromRight / 16) * 100}% + 1rem)`;

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

  // Capture snapshot only when entering edit mode, not on every layout change.
  // Including bentoLayout in deps would overwrite the snapshot after every swap,
  // making "cancel" unable to restore the pre-edit state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (bentoDragEnabled) {
      layoutSnapshotRef.current = JSON.parse(JSON.stringify(bentoLayout));
    }
  }, [bentoDragEnabled]);

  // Auto-exit edit mode after editAutoExitDelay ms of inactivity.
  // Timer resets on any pointer interaction. Disabled when delay === 0.
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
        {/* Full-page 3D building background */}
        <BuildingView ref={buildingRef} className="absolute inset-0 z-0 h-full w-full" />

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
              className={cn("transition-all duration-300 ease-in-out", fullscreen && "opacity-0")}
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
              bentoDragEnabled && "opacity-0 pointer-events-none",
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
              onClick={() => buildingRef.current?.resetCamera()}
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
