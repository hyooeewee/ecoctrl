import type { BentoLayoutItem } from "~/store/settings";

import { breakdownWidget } from "./chart-breakdown";
import { trendWidget } from "./chart-trend";
import { aiWidget } from "./panel-ai";
import { alertsWidget } from "./panel-alerts";
import { deviceStatusWidget } from "./panel-device-status";
import { carbonWidget } from "./stat-carbon";
import { costWidget } from "./stat-cost";
import { intensityWidget } from "./stat-intensity";
import { loadWidget } from "./stat-load";
import { renewableWidget } from "./stat-renewable";
import { totalEnergyWidget } from "./stat-total-energy";
import type { DashboardWidget } from "./types";

// ─── Register all widgets here ────────────────────────────────────────────────
// To add a new widget: import it and add to this array.
// To remove a widget: delete it from this array (and optionally delete its file).

export const allWidgets: DashboardWidget[] = [
  totalEnergyWidget,
  carbonWidget,
  intensityWidget,
  costWidget,
  renewableWidget,
  loadWidget,
  deviceStatusWidget,
  alertsWidget,
  aiWidget,
  trendWidget,
  breakdownWidget,
];

// Build the default bento layout from registered widgets
export function buildDefaultBentoLayout(): BentoLayoutItem[] {
  return allWidgets.map((w) => ({
    id: w.id,
    x: w.defaultLayout.x,
    y: w.defaultLayout.y,
    w: w.defaultLayout.w,
    h: w.defaultLayout.h,
    hidden: false,
  }));
}
