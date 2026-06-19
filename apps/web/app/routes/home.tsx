import { Undo2, Check, Maximize, Minimize, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLoaderData, useNavigate, useOutletContext } from "react-router";

import { BentoGrid } from "~/components/dashboard/bento-grid";
import { DashboardHeader } from "~/components/dashboard/dashboard-header";
import { DashboardWidgets } from "~/components/dashboard/widgets";
import { fetchDashboardData, type DashboardData } from "~/lib/dashboard-api";
import { API_PREFIX } from "~/lib/env";
import { cn } from "~/lib/utils";
import { locale, useLocale } from "~/locales";
import { useAuthStore } from "~/store/auth";
import { useSettingsStore, type BentoLayoutItem } from "~/store/settings";
import { useWidgetDataStore } from "~/store/widgetData";
import { useSse } from "~/hooks/use-sse";
import type { SSEMessage } from "~/lib/sse";

import type { DashboardOutletContext } from "./dashboard-layout";
import type { Route } from "./+types/home";

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [{ title: locale.meta.title }, { name: "description", content: locale.meta.description }];
}

// ─── Loader ─────────────────────────────────────────────────────────────────────

export async function clientLoader(): Promise<{
  dashboard: DashboardData | null;
}> {
  const dashboard = await fetchDashboardData().catch((err) => {
    console.error("[clientLoader] fetchDashboardData failed:", err);
    return null;
  });
  return { dashboard };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const t = useLocale();
  const navigate = useNavigate();
  const loaderData = useLoaderData() as {
    dashboard: DashboardData | null;
  };
  const { buildingRef, activeLabel, setActiveLabel } = useOutletContext<DashboardOutletContext>();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn());
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const bentoDragEnabled = useSettingsStore((state) => state.bentoDragEnabled);
  const bentoLayout = useSettingsStore((state) => state.bentoLayout);
  const editAutoExitDelay = useSettingsStore((state) => state.editAutoExitDelay);
  const setBentoDragEnabled = useSettingsStore((state) => state.setBentoDragEnabled);
  const setBentoLayout = useSettingsStore((state) => state.setBentoLayout);
  const hydrateBentoLayout = useSettingsStore((state) => state.hydrateBentoLayout);
  const resetBentoLayout = useSettingsStore((state) => state.resetBentoLayout);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  const [fullscreen, setFullscreen] = useState(false);
  const layoutSnapshotRef = useRef<BentoLayoutItem[] | null>(null);
  const hasSnappedRef = useRef(false);

  // ─── SSE: real-time widget data ───────────────────────────────────────────────

  const setWidgetData = useWidgetDataStore((s) => s.setWidgetData);
  const removeWidgetData = useWidgetDataStore((s) => s.removeWidgetData);

  const onSseMessage = useCallback(
    (msg: SSEMessage) => {
      console.log("[SSE] received:", msg.type, msg.payload);
      if (msg.type === "widget_update") {
        const { metricKey, data } = msg.payload as {
          metricKey: string;
          data: Record<string, unknown>;
        };
        setWidgetData(metricKey, data);
      } else if (msg.type === "widget_delete") {
        const { metricKey } = msg.payload as { metricKey: string };
        removeWidgetData(metricKey);
      }
    },
    [setWidgetData, removeWidgetData],
  );

  const { isConnected, isReconnecting } = useSse({
    url: `${API_PREFIX}/events`,
    enabled: isLoggedIn,
    onMessage: onSseMessage,
  });

  const sseStatus = isConnected ? "connected" : isReconnecting ? "reconnecting" : "disconnected";

  // Immersive mode is triggered by either fullscreen button or clicking a label.
  const isImmersive = fullscreen || activeLabel !== null;

  const rightmostTopWidget = bentoLayout
    .filter((item) => !item.hidden && item.y <= 4)
    .slice()
    .sort((a, b) => b.x + b.w - (a.x + a.w))[0];

  const colsFromRight = rightmostTopWidget ? 16 - rightmostTopWidget.x + 1 : 0;
  const controlsRight =
    isImmersive || colsFromRight === 0 ? "1rem" : `calc(${(colsFromRight / 16) * 100}% + 1rem)`;

  // Load server settings on mount (non-blocking, server-side priority).
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Refresh user info on mount if already logged in.
  useEffect(() => {
    if (isLoggedIn) {
      fetchUser();
    }
  }, [isLoggedIn, fetchUser]);

  // Sync backend widget metadata → bentoLayout.
  // Layout (position / size / hidden) now comes directly from the API,
  // which merges dashboard_widgets defaults with user_settings overrides.
  // Uses hydrateBentoLayout so this effect does NOT mark hasUnsavedChanges,
  // preventing loadSettings() from skipping the server fetch.
  useEffect(() => {
    if (!loaderData?.dashboard?.widgets?.length) return;

    const incomingIds = new Set(loaderData.dashboard.widgets.map((w) => w.id));
    const currentIds = new Set(bentoLayout.map((l) => l.id));

    // Remove widgets that the backend no longer returns.
    const cleaned = bentoLayout.filter((l) => incomingIds.has(l.id));

    // Use API layout for newly discovered widgets.
    const newItems: BentoLayoutItem[] = [];
    for (const w of loaderData.dashboard.widgets) {
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
      hydrateBentoLayout(next);
      return;
    }

    if (cleaned.length !== bentoLayout.length || newItems.length > 0) {
      hydrateBentoLayout(next);
    }
  }, [loaderData, bentoLayout, hydrateBentoLayout]);

  // When a label is selected, animate camera to focus on it.
  // For lobby: enable horizontal cross-section clip plane.
  useEffect(() => {
    if (activeLabel) {
      buildingRef.current?.focusOnLabel(activeLabel);
      buildingRef.current?.setClipping(activeLabel === "lobby");
    } else {
      buildingRef.current?.setClipping(false);
    }
  }, [activeLabel, buildingRef]);

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
    <div className="flex h-full flex-col pointer-events-none">
      {/* Header */}
      <div className="pointer-events-auto">
        <DashboardHeader onLogoClick={() => navigate("/settings")} sseStatus={sseStatus} />
      </div>

      {/* Main bento grid layout — cards re-enable events individually */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <BentoGrid
          className={cn(
            "transition-all duration-300 ease-in-out",
            isImmersive && "opacity-0 pointer-events-none",
          )}
        >
          <DashboardWidgets data={loaderData?.dashboard ?? null} />
        </BentoGrid>
      </main>

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
              buildingRef.current?.enterImmersive();
            } else {
              buildingRef.current?.exitImmersive();
            }
            setFullscreen((v) => !v);
          }}
          className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
          title={fullscreen ? t.controls.exitFullscreen : t.controls.fullscreen}
        >
          {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          onClick={() => buildingRef.current?.zoomIn()}
          className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
          title={t.controls.zoomIn}
        >
          <Plus size={16} />
        </button>
        <div className="h-px bg-white/10" />
        <button
          type="button"
          onClick={() => buildingRef.current?.zoomOut()}
          className="text-cyber-cyan flex size-8 items-center justify-center transition-colors hover:bg-white/10"
          title={t.controls.zoomOut}
        >
          <Minus size={16} />
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
          <RotateCcw size={16} />
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
            <Check size={14} />
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
            <X size={14} />
            {t.editLayout.cancel}
          </button>
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => resetBentoLayout()}
            className="text-foreground/80 hover:text-cyber-cyan flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
          >
            <Undo2 size={14} />
            {t.editLayout.reset}
          </button>
        </div>
      )}
    </div>
  );
}
