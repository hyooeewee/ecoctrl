import { getNestedLocaleValue, useLocale } from "~/locales";

import { DynamicIcon } from "./dynamic-icon";
import type { WidgetConfig, ChartData } from "./types";
import { EnergyTrendChart, EnergyBreakdownChart } from "./energy-charts";

interface ChartWidgetProps {
  widget: WidgetConfig;
  data: ChartData;
}

export function ChartWidget({ widget, data }: ChartWidgetProps) {
  const t = useLocale();
  const title = getNestedLocaleValue(t, widget.titleKey) ?? widget.titleKey;

  if (data.chartType === "area" || data.chartType === "line" || data.chartType === "bar") {
    return (
      <EnergyTrendChart
        data={data.points ?? []}
        title={title}
        icon={<DynamicIcon name={widget.icon} size={14} />}
        chartType={data.chartType}
      />
    );
  }

  if (data.chartType === "donut") {
    /* oxlint-disable-next-line no-map-spread */
    const items = (data.items ?? []).map((item) => ({
      ...item,
      label: getNestedLocaleValue(t, item.label) ?? item.label,
    }));
    return (
      <EnergyBreakdownChart
        data={items}
        title={title}
        icon={<DynamicIcon name={widget.icon} size={14} />}
      />
    );
  }

  return null;
}
