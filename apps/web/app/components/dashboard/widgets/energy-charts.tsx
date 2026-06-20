import { useMemo, useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@ecoctrl/ui/chart";
import type { ChartConfig } from "@ecoctrl/ui/chart";

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function TrendTooltip({
  active,
  payload,
  label,
  timeUnit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  timeUnit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-white/10 bg-panel-dark/95 px-2 py-1.5 text-[10px] shadow-xl backdrop-blur">
      <span className="text-muted-foreground">
        {label}
        {timeUnit}
      </span>
      <span className="ml-2 font-semibold tabular-nums text-foreground">
        {payload[0].value} kWh
      </span>
    </div>
  );
}

// ─── 24-Hour Energy Trend ─────────────────────────────────────────────────────

interface ChartPoint {
  label: string;
  value: number;
}

interface EnergyTrendChartProps {
  className?: string;
  data: ChartPoint[];
  title: string;
  icon: React.ReactNode;
  chartType?: "area" | "line" | "bar";
}

export function EnergyTrendChart({
  className,
  data,
  title,
  icon,
  chartType = "area",
}: EnergyTrendChartProps) {
  const t = useLocale();
  const color = "var(--color-chart-1)";
  const baseId = useId().replace(/:/g, "");
  const gradId = `trend-grad-${chartType}-${baseId}`;

  const chartData = useMemo(() => data.map((d, i) => ({ ...d, t: i })), [data]);

  const chartConfig = useMemo(
    () => ({
      value: { label: title, color },
    }),
    [title, color],
  );

  return (
    <div className={cn("flex h-full flex-col gap-2 p-3", className)}>
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground">{title}</p>
      </div>
      <ChartContainer config={chartConfig} className="min-h-0 flex-1">
        {chartType === "area" && (
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${t.charts.trendTimeUnit}`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <ChartTooltip
              content={<TrendTooltip timeUnit={t.charts.trendTimeUnit} />}
              cursor={{ stroke: "oklch(1 0 0 / 10%)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        )}

        {chartType === "line" && (
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${t.charts.trendTimeUnit}`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <ChartTooltip
              content={<TrendTooltip timeUnit={t.charts.trendTimeUnit} />}
              cursor={{ stroke: "oklch(1 0 0 / 10%)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        )}

        {chartType === "bar" && (
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barSize={12}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(1 0 0 / 6%)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}${t.charts.trendTimeUnit}`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "oklch(0.708 0 0)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <ChartTooltip
              content={<TrendTooltip timeUnit={t.charts.trendTimeUnit} />}
              cursor={{ fill: "oklch(1 0 0 / 5%)" }}
            />
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  );
}

// ─── Energy Breakdown Pie ─────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
  "var(--color-chart-7)",
  "var(--color-chart-8)",
  "var(--color-chart-9)",
  "var(--color-chart-10)",
];

interface BreakdownItem {
  label: string;
  value: number;
  color?: string;
}

interface EnergyBreakdownChartProps {
  className?: string;
  data: BreakdownItem[];
  total?: number;
  title: string;
  icon: React.ReactNode;
}

export function EnergyBreakdownChart({
  className,
  data,
  total,
  title,
  icon,
}: EnergyBreakdownChartProps) {
  const MAX_LEGEND_ITEMS = 6;

  const totalValue = useMemo(
    () => total ?? data.reduce((sum, item) => sum + item.value, 0),
    [total, data],
  );

  // Split data into top items and "其他" (Other) bucket
  const displayData = useMemo(() => {
    if (data.length <= MAX_LEGEND_ITEMS) {
      return data;
    }
    const top = data.slice(0, MAX_LEGEND_ITEMS);
    const rest = data.slice(MAX_LEGEND_ITEMS);
    const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
    return [...top, { label: "其他", value: otherValue }];
  }, [data]);

  const chartData = useMemo(
    () => displayData.map((item, index) => ({ ...item, key: `item-${index}` })),
    [displayData],
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (let i = 0; i < chartData.length; i++) {
      const item = chartData[i];
      config[item.key] = {
        label: item.label,
        color: item.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      };
    }
    return config;
  }, [chartData]);

  return (
    <div className={cn("flex h-full flex-col gap-2 p-3", className)}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--color-chart-3)" }}>{icon}</span>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground">{title}</p>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-3">
        {/* Donut chart with centered total — left side */}
        <div className="relative h-full max-h-full shrink-0 basis-auto aspect-square">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="key"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                strokeWidth={0}
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Center total — absolutely positioned over the donut hole */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold tabular-nums text-foreground">
              {totalValue.toLocaleString()}
            </span>
            <span className="text-[8px] text-muted-foreground">kWh</span>
          </div>
        </div>

        {/* Vertical legend — stays inside the widget and scrolls if needed */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-y-auto text-[10px]">
          {chartData.map((item, index) => {
            const color = item.color ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <div key={item.key} className="flex items-center gap-1.5 py-1">
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate text-muted-foreground">{item.label}</span>
                <span className="ml-auto shrink-0 tabular-nums font-medium text-foreground">
                  {item.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
