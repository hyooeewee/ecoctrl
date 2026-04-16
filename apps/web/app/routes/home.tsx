import {
  IconActivity,
  IconBolt,
  IconCoin,
  IconLeaf,
  IconMaximize,
  IconMinimize,
  IconMinus,
  IconPlus,
  IconReload,
  IconSun,
  IconWind,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BuildingView, type BuildingViewRef } from "~/components/dashboard/building-view";
import { DashboardHeader } from "~/components/dashboard/dashboard-header";
import { DashboardNav } from "~/components/dashboard/dashboard-nav";
import { EnergyBreakdownChart, EnergyTrendChart } from "~/components/dashboard/energy-charts";
import {
  GraphButtonBlock,
  GraphButtonBlockDetail,
} from "~/components/dashboard/graph-button-block";
import { AISuggestions, AlertsPanel, DeviceStatus } from "~/components/dashboard/right-panels";
import { ExpandableModal } from "~/components/expandable-modal";
import { NAV_HIDE_DELAY } from "~/config/dashboard";
import {
  CARD_VALUES,
  CARBON_DATA,
  COST_DATA,
  ENERGY_DATA,
  INTENSITY_DATA,
  LOAD_DATA,
  RENEWABLE_DATA,
} from "~/data/dashboard";
import { cn } from "~/lib/utils";
import { locale as t } from "~/locales";

import type { Route } from "./+types/home";

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [{ title: t.meta.title }, { name: "description", content: t.meta.description }];
}

// ─── Left panel card definitions ──────────────────────────────────────────────

const CARDS = [
  {
    title: t.cards.totalEnergy,
    icon: <IconBolt size={12} />,
    ...CARD_VALUES.totalEnergy,
    unit: "kWh",
    chartType: "area" as const,
    chartData: ENERGY_DATA,
    chartColor: "var(--color-chart-1)",
    footer: t.cards.totalEnergyFooter,
  },
  {
    title: t.cards.carbonEmission,
    icon: <IconLeaf size={12} />,
    ...CARD_VALUES.carbonEmission,
    unit: "kg CO₂",
    chartType: "bar" as const,
    chartData: CARBON_DATA,
    chartColor: "var(--color-chart-2)",
    footer: t.cards.carbonFooter,
  },
  {
    title: t.cards.energyIntensity,
    icon: <IconActivity size={12} />,
    ...CARD_VALUES.energyIntensity,
    unit: "kWh/m²",
    chartType: "line" as const,
    chartData: INTENSITY_DATA,
    chartColor: "var(--color-chart-1)",
    footer: t.cards.intensityFooter,
  },
  {
    title: t.cards.todayCost,
    icon: <IconCoin size={12} />,
    ...CARD_VALUES.todayCost,
    unit: t.cards.costUnit,
    chartType: "area" as const,
    chartData: COST_DATA,
    chartColor: "var(--color-chart-4)",
    footer: t.cards.costFooter,
  },
  {
    title: t.cards.renewableRate,
    icon: <IconSun size={12} />,
    ...CARD_VALUES.renewableRate,
    unit: "%",
    delta: t.cards.renewableTarget,
    chartType: "progress" as const,
    chartData: RENEWABLE_DATA,
    chartColor: "var(--color-cyber-green)",
  },
  {
    title: t.cards.loadStatus,
    icon: <IconWind size={12} />,
    ...CARD_VALUES.loadStatus,
    unit: "%",
    delta: t.cards.loadNormal,
    chartType: "progress" as const,
    chartData: LOAD_DATA,
    chartColor: "var(--color-chart-2)",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [navVisible, setNavVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buildingRef = useRef<BuildingViewRef>(null);

  // Start/reset the 30s auto-hide countdown
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setNavVisible(false), NAV_HIDE_DELAY);
  }, []);

  // Toggle nav on logo click
  const handleLogoClick = useCallback(() => {
    setNavVisible((prev) => {
      if (!prev) {
        // Opening — start countdown
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setNavVisible(false), NAV_HIDE_DELAY);
      } else {
        // Closing — cancel countdown
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

  return (
    <div className="dark">
      <div className="text-foreground relative h-screen overflow-hidden font-mono">
        {/* Full-page 3D building background */}
        <BuildingView ref={buildingRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* Overlay layout */}
        <div className="absolute inset-0 z-10 flex flex-col">
          {/* Header */}
          <DashboardHeader onLogoClick={handleLogoClick} navVisible={navVisible} />

          {/* Main 3-column layout */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left Panel: 6 graph-button-blocks */}
            <aside
              className={cn(
                "relative flex w-[280px] shrink-0 flex-col gap-1.5 overflow-hidden p-1.5 transition-all duration-300 ease-in-out",
                fullscreen && "pointer-events-none -translate-x-full opacity-0",
              )}
            >
              {/* Left accent glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[2px]"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent, var(--color-cyber-cyan), transparent)",
                  opacity: 0.5,
                }}
              />
              {CARDS.map((card) => (
                <ExpandableModal
                  key={card.title}
                  trigger={<GraphButtonBlock {...card} className="min-h-0 flex-1" />}
                >
                  <GraphButtonBlockDetail {...card} />
                </ExpandableModal>
              ))}
            </aside>

            {/* Center: transparent pass-through to background building */}
            <main
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden",
                fullscreen && "pointer-events-none",
              )}
            >
              {/* Spacer to let building show through */}
              <div className="min-h-0 flex-1" />
              {/* Bottom charts — bento row */}
              <div
                className={cn(
                  "flex shrink-0 gap-1.5 p-1.5 transition-all duration-300 ease-in-out",
                  fullscreen && "translate-y-full opacity-0",
                )}
              >
                <EnergyTrendChart className="min-w-0 flex-[3]" />
                <EnergyBreakdownChart className="min-w-0 flex-[2]" />
              </div>
            </main>

            {/* Right Panel: device status / alerts / AI */}
            <aside
              className={cn(
                "flex min-h-0 w-[320px] shrink-0 flex-col gap-1.5 overflow-hidden border-white/15 p-1.5 transition-all duration-300 ease-in-out",
                fullscreen && "pointer-events-none translate-x-full opacity-0",
              )}
            >
              <DeviceStatus />
              <AlertsPanel />
              <AISuggestions />
            </aside>
          </div>

          {/* Bottom navigation — slides in/out from bottom */}
          <div
            className="shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: fullscreen ? "0px" : navVisible ? "60px" : "0px",
              opacity: fullscreen ? 0 : navVisible ? 1 : 0,
            }}
          >
            <DashboardNav />
          </div>

          {/* Floating controls — fullscreen / zoom / reset */}
          <div
            className={cn(
              "absolute top-[72px] z-30 flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 backdrop-blur-md transition-all duration-300",
              fullscreen ? "right-4" : "right-[calc(320px+theme(space.4))]",
            )}
          >
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
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
        </div>
      </div>
    </div>
  );
}
