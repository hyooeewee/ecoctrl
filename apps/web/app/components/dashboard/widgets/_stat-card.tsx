import {
  GraphButtonBlock,
  GraphButtonBlockDetail,
} from "~/components/dashboard/graph-button-block";
import { ExpandableModal } from "~/components/expandable-modal";
import { getNestedLocaleValue, useLocale } from "~/locales";

import { DynamicIcon } from "./dynamic-icon";
import type { StatData, WidgetConfig } from "./types";

export function StatCard({ widget, data }: { widget: WidgetConfig; data: StatData }) {
  const t = useLocale();
  const title = getNestedLocaleValue(t, widget.titleKey) ?? widget.titleKey;
  const footer = data.footerKey ? getNestedLocaleValue(t, data.footerKey) : undefined;
  const unit = getNestedLocaleValue(t, data.unit) ?? data.unit;
  const delta = data.delta ? (getNestedLocaleValue(t, data.delta) ?? data.delta) : undefined;

  const chartData = data.sparkline?.map((v) => ({ v })) ?? [];
  const hasSparkline = chartData.length > 0;

  const props = {
    title,
    icon: <DynamicIcon name={widget.icon} size={12} />,
    value: data.value,
    unit,
    delta,
    deltaVariant: data.deltaVariant,
    chartType: (hasSparkline ? "area" : "progress") as "area" | "progress",
    chartData,
    progressValue: data.progressValue,
    chartColor: data.sparklineColor ?? "var(--color-chart-1)",
    footer,
  };

  return (
    <ExpandableModal
      className="flex min-h-0 flex-1 flex-col"
      trigger={<GraphButtonBlock {...props} className="flex-1" />}
    >
      <GraphButtonBlockDetail {...props} />
    </ExpandableModal>
  );
}
