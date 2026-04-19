import type { DashboardData } from "~/lib/dashboard-api";
import { useLocale } from "~/locales";

import { EnergyTrendChart } from "./energy-charts";
import type { DashboardWidget } from "./types";

export function TrendWidget({ data }: { data: DashboardData | null }) {
  const t = useLocale();
  if (!data || data.trend.length === 0) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {t.charts.trendTitle}
        </p>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground">
          {t.charts.noData}
        </div>
      </div>
    );
  }
  return <EnergyTrendChart data={data.trend} />;
}

export const trendWidget: DashboardWidget = {
  id: "chart-trend",
  title: (t) => t.bentoWidgets["chart-trend"],
  defaultLayout: { x: 1, y: 7, w: 6, h: 2 },
  component: TrendWidget,
};
