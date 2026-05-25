import type { WidgetConfig, WidgetData } from "./types";
import { StatCard } from "./_stat-card";
import { ChartWidget } from "./chart-widget";
import { ListWidget } from "./list-widget";
import { WeatherWidget } from "./weather-widget";

interface WidgetRendererProps {
  widget: WidgetConfig;
  liveData?: WidgetData;
}

export function WidgetRenderer({ widget, liveData }: WidgetRendererProps) {
  const d = liveData ?? widget.data;

  if ("location" in d && "currentTemp" in d) {
    return <WeatherWidget widget={widget} data={d} />;
  }

  if ("value" in d && typeof d.value === "string") {
    return <StatCard widget={widget} data={d} />;
  }

  if ("chartType" in d && typeof d.chartType === "string") {
    return <ChartWidget widget={widget} data={d} />;
  }

  if ("items" in d && Array.isArray(d.items) && !("chartType" in d)) {
    return <ListWidget widget={widget} data={d} />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
      Unsupported widget
    </div>
  );
}
