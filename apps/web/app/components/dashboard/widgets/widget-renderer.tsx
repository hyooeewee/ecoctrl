import type { WidgetConfig, WidgetData, ChartData, ListData } from "./types";
import { StatCard } from "./_stat-card";
import { ChartWidget } from "./chart-widget";
import { ListWidget } from "./list-widget";
import { WeatherWidget } from "./weather-widget";

interface WidgetRendererProps {
  widget: WidgetConfig;
  liveData?: WidgetData;
}

function isChartData(d: WidgetData): boolean {
  const raw = d as Record<string, unknown>;

  if (Array.isArray(raw.points) && raw.points.length > 0) return true;

  if (Array.isArray(raw.items) && raw.items.length > 0) {
    const first = raw.items[0] as Record<string, unknown> | undefined;
    if (!first || typeof first !== "object") return false;

    // Chart items are { label, value [, color] }
    // Distinguish from list items which carry title/status/text etc.
    return (
      typeof first.label === "string" &&
      typeof first.value === "number" &&
      !("title" in first) &&
      !("status" in first) &&
      !("text" in first)
    );
  }

  return false;
}

export function WidgetRenderer({ widget, liveData }: WidgetRendererProps) {
  const d = liveData ?? widget.data;

  if ("location" in d && "currentTemp" in d) {
    return <WeatherWidget widget={widget} data={d} />;
  }

  if ("value" in d && typeof d.value === "string") {
    return <StatCard widget={widget} data={d} />;
  }

  if (isChartData(d)) {
    return <ChartWidget widget={widget} data={d as ChartData} />;
  }

  if ("items" in d && Array.isArray(d.items)) {
    return <ListWidget widget={widget} data={d as ListData} />;
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
      Unsupported widget
    </div>
  );
}
