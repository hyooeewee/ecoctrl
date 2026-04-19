import type { DashboardData } from "~/lib/dashboard-api";

import { EnergyTrendChart } from "./energy-charts";
import type { DashboardWidget } from "./types";

export function TrendWidget({ data }: { data: DashboardData }) {
  return <EnergyTrendChart data={data.trend} />;
}

export const trendWidget: DashboardWidget = {
  id: "chart-trend",
  title: (t) => t.bentoWidgets["chart-trend"],
  defaultLayout: { x: 1, y: 7, w: 6, h: 2 },
  component: TrendWidget,
};
