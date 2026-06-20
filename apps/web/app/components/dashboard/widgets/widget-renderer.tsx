import type { WidgetConfig, WidgetInitData } from "./types";
import { StatCard } from "./_stat-card";
import { EnergyBreakdownChart, EnergyTrendChart } from "./energy-charts";
import { DynamicIcon } from "./dynamic-icon";
import { ListWidget } from "./list-widget";
import { WeatherWidget } from "./weather-widget";

interface WidgetRendererProps {
  widget: WidgetConfig;
  liveData?: WidgetInitData;
}

/**
 * Routes widget rendering based on dataType (from DB) + config fields.
 * Data = liveData (SSE) ?? initData (REST fallback).
 */
export function WidgetRenderer({ widget, liveData }: WidgetRendererProps) {
  const { dataType, metricKey, dataJson } = widget;
  const { initData, ...config } = dataJson;

  // SSE data覆盖初始数据（shallow merge，结构一致）
  const data = liveData
    ? { ...(initData as Record<string, unknown>), ...(liveData as Record<string, unknown>) }
    : initData;

  switch (dataType) {
    case "stat":
      return (
        <StatCard
          data={data}
          unit={config.unit as string}
          sparklineColor={config.sparklineColor as string}
          footerKey={config.footerKey as string}
          trendDirection={config.trendDirection as "good" | "bad"}
        />
      );

    case "chart": {
      const chartData = data as Record<string, unknown>;
      if (config.chartType === "donut") {
        return (
          <EnergyBreakdownChart
            data={
              (chartData.items as Array<{ label: string; value: number; color?: string }>) ?? []
            }
            total={chartData.total as number}
          />
        );
      }
      return (
        <EnergyTrendChart
          data={(chartData.points as Array<{ label: string; value: number }>) ?? []}
          chartType={config.chartType as "area" | "line" | "bar"}
        />
      );
    }

    case "list":
      return <ListWidget widget={widget} data={data as { items: Record<string, unknown>[] }} />;

    case "weather":
      return <WeatherWidget widget={widget} data={data} />;

    default:
      return (
        <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
          Unsupported widget
        </div>
      );
  }
}
