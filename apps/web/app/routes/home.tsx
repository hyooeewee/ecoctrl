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
import { GraphButtonBlock } from "~/components/dashboard/graph-button-block";
import { AISuggestions, AlertsPanel, DeviceStatus } from "~/components/dashboard/right-panels";
import { cn } from "~/lib/utils";
import { locale as t } from "~/locales";

import type { Route } from "./+types/home";

// ─── Meta ──────────────────────────────────────────────────────────────────────

export function meta(_args: Route.MetaArgs) {
  return [{ title: t.meta.title }, { name: "description", content: t.meta.description }];
}

// ─── Sparkline data ────────────────────────────────────────────────────────────

const ENERGY_DATA = [
  { v: 280 },
  { v: 310 },
  { v: 295 },
  { v: 340 },
  { v: 380 },
  { v: 420 },
  { v: 395 },
  { v: 440 },
  { v: 410 },
  { v: 460 },
  { v: 480 },
  { v: 500 },
];
const CARBON_DATA = [
  { v: 280 },
  { v: 320 },
  { v: 290 },
  { v: 350 },
  { v: 310 },
  { v: 270 },
  { v: 340 },
];
const INTENSITY_DATA = [
  { v: 120 },
  { v: 115 },
  { v: 112 },
  { v: 108 },
  { v: 105 },
  { v: 103 },
  { v: 100 },
  { v: 99 },
  { v: 97 },
  { v: 96 },
  { v: 97 },
  { v: 98 },
];
const COST_DATA = [
  { v: 180 },
  { v: 210 },
  { v: 195 },
  { v: 240 },
  { v: 280 },
  { v: 310 },
  { v: 290 },
  { v: 330 },
  { v: 350 },
  { v: 370 },
  { v: 385 },
  { v: 400 },
];
const RENEWABLE_DATA = [
  { v: 78 },
  { v: 80 },
  { v: 81 },
  { v: 80 },
  { v: 82 },
  { v: 84 },
  { v: 83 },
  { v: 85 },
  { v: 84 },
  { v: 86 },
  { v: 85 },
  { v: 85 },
];
const LOAD_DATA = [
  { v: 55 },
  { v: 58 },
  { v: 60 },
  { v: 63 },
  { v: 61 },
  { v: 60 },
  { v: 58 },
  { v: 59 },
  { v: 60 },
  { v: 62 },
  { v: 61 },
  { v: 60 },
];

// ─── Left panel card definitions ──────────────────────────────────────────────

const CARDS = [
  {
    title: t.cards.totalEnergy,
    icon: <IconBolt size={12} />,
    value: "8,456",
    unit: "kWh",
    delta: "+12%",
    deltaVariant: "up-bad" as const,
    chartType: "area" as const,
    chartData: ENERGY_DATA,
    chartColor: "var(--color-chart-1)",
    footer: t.cards.totalEnergyFooter,
  },
  {
    title: t.cards.carbonEmission,
    icon: <IconLeaf size={12} />,
    value: "2,340",
    unit: "kg CO₂",
    delta: "+2%",
    deltaVariant: "up-bad" as const,
    chartType: "bar" as const,
    chartData: CARBON_DATA,
    chartColor: "var(--color-chart-2)",
    footer: t.cards.carbonFooter,
  },
  {
    title: t.cards.energyIntensity,
    icon: <IconActivity size={12} />,
    value: "98",
    unit: "kWh/m²",
    delta: "−7%",
    deltaVariant: "down-good" as const,
    chartType: "line" as const,
    chartData: INTENSITY_DATA,
    chartColor: "var(--color-chart-1)",
    footer: t.cards.intensityFooter,
  },
  {
    title: t.cards.todayCost,
    icon: <IconCoin size={12} />,
    value: "5,240",
    unit: t.cards.costUnit,
    delta: "+8%",
    deltaVariant: "up-bad" as const,
    chartType: "area" as const,
    chartData: COST_DATA,
    chartColor: "var(--color-chart-4)",
    footer: t.cards.costFooter,
  },
  {
    title: t.cards.renewableRate,
    icon: <IconSun size={12} />,
    value: "85",
    unit: "%",
    delta: t.cards.renewableTarget,
    deltaVariant: "neutral" as const,
    chartType: "progress" as const,
    chartData: RENEWABLE_DATA,
    progressValue: 85,
    chartColor: "var(--color-cyber-green)",
  },
  {
    title: t.cards.loadStatus,
    icon: <IconWind size={12} />,
    value: "60",
    unit: "%",
    delta: t.cards.loadNormal,
    deltaVariant: "up-good" as const,
    chartType: "progress" as const,
    chartData: LOAD_DATA,
    progressValue: 60,
    chartColor: "var(--color-chart-2)",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

const NAV_HIDE_DELAY = 30_000;

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
                <GraphButtonBlock key={card.title} {...card} className="min-h-0 flex-1" />
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
