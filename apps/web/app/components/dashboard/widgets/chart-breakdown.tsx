import type { DashboardData } from "~/lib/dashboard-api";
import { useLocale } from "~/locales";

import { EnergyBreakdownChart } from "./energy-charts";
import type { DashboardWidget } from "./types";

export function BreakdownWidget({ data }: { data: DashboardData | null }) {
  const t = useLocale();
  if (!data || data.breakdown.length === 0) {
    return (
      <div className="flex h-full flex-col gap-2 p-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {t.charts.breakdownTitle}
        </p>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground">
          {t.charts.noData}
        </div>
      </div>
    );
  }
  return <EnergyBreakdownChart data={data.breakdown} />;
}

export const breakdownWidget: DashboardWidget = {
  id: "chart-breakdown",
  title: (t) => t.bentoWidgets["chart-breakdown"],
  defaultLayout: { x: 7, y: 7, w: 4, h: 2 },
  component: BreakdownWidget,
};
