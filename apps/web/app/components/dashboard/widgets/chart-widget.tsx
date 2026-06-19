import { getNestedLocaleValue, getWidgetTitle, useLocale } from "~/locales";

import { DynamicIcon } from "./dynamic-icon";
import type { WidgetConfig, ChartData } from "./types";
import { EnergyTrendChart, EnergyBreakdownChart } from "./energy-charts";

interface ChartWidgetProps {
  widget: WidgetConfig;
  data: ChartData;
}

export function ChartWidget({ widget, data }: ChartWidgetProps) {
  const t = useLocale();
  const title = getWidgetTitle(t, widget.metricKey);

  if (Array.isArray(data.points) && data.points.length > 0) {
    const trendType = data.chartType ?? "area";
    if (trendType === "area" || trendType === "line" || trendType === "bar") {
      return (
        <EnergyTrendChart
          data={data.points}
          title={title}
          icon={<DynamicIcon name={widget.icon} size={14} />}
          chartType={trendType}
        />
      );
    }
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    /* oxlint-disable-next-line no-map-spread */
    const items = data.items.map((item) => ({
      ...item,
      label: getNestedLocaleValue(t, item.label) ?? item.label,
    }));
    return (
      <EnergyBreakdownChart
        data={items}
        total={data.total}
        title={title}
        icon={<DynamicIcon name={widget.icon} size={14} />}
      />
    );
  }

  return null;
}
