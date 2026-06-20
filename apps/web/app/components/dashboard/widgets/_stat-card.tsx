import { useOutletContext } from "react-router";

import {
  GraphButtonBlock,
  GraphButtonBlockDetail,
} from "~/components/dashboard/graph-button-block";
import { ExpandableModal } from "~/components/expandable-modal";
import { getNestedLocaleValue, getWidgetTitle, useLocale } from "~/locales";

import { DynamicIcon } from "./dynamic-icon";
import type { StatInitData, WidgetConfig } from "./types";
import type { DashboardOutletContext } from "~/routes/dashboard-layout";

interface StatCardProps {
  data: Record<string, unknown>;
  unit?: string;
  sparklineColor?: string;
  footerKey?: string;
  trendDirection?: "good" | "bad";
}

function computeTrendType(trend: string | undefined, direction: "good" | "bad"): string {
  if (!trend) return "neutral";
  const isUp = trend.startsWith("+");
  if (direction === "bad") return isUp ? "up-bad" : "down-good";
  return isUp ? "up-good" : "down-bad";
}

export function StatCard({ data, unit, sparklineColor, footerKey, trendDirection }: StatCardProps) {
  const t = useLocale();
  const { activeLabel } = useOutletContext<DashboardOutletContext>();

  const statData = data as StatInitData;
  const resolvedUnit = unit ? (getNestedLocaleValue(t, unit) ?? unit) : undefined;
  const footer = footerKey ? getNestedLocaleValue(t, footerKey) : undefined;
  const delta = statData.trend
    ? (getNestedLocaleValue(t, statData.trend) ?? statData.trend)
    : undefined;
  const deltaVariant = computeTrendType(statData.trend, trendDirection ?? "bad");

  const chartData = statData.sparkline?.map((v) => ({ v })) ?? [];
  const hasSparkline = chartData.length > 0;

  const props = {
    title: "",
    icon: null,
    value: statData.value,
    unit: resolvedUnit,
    delta,
    deltaVariant,
    chartType: (hasSparkline ? "area" : "progress") as "area" | "progress",
    chartData,
    chartColor: sparklineColor ?? "var(--color-chart-1)",
    footer,
  };

  return (
    <ExpandableModal
      className="flex min-h-0 flex-1 flex-col"
      trigger={<GraphButtonBlock {...props} className="flex-1" />}
      disabled={activeLabel !== null}
    >
      <GraphButtonBlockDetail {...props} />
    </ExpandableModal>
  );
}
