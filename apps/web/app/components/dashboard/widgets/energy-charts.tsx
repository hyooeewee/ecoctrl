import { useMemo, useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@ecoctrl/ui/chart";
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
  const totalValue = useMemo(
    () => total ?? data.reduce((sum, item) => sum + item.value, 0),
    [total, data],
  );

  const chartData = useMemo(
    () => data.map((item, index) => ({ ...item, key: `item-${index}` })),
    [data],
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

      <ChartContainer config={chartConfig} className="aspect-square min-h-0 flex-1">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="key"
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="78%"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-[11px] font-bold"
                      >
                        {totalValue.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 12}
                        className="fill-muted-foreground text-[8px]"
                      >
                        kWh
                      </tspan>
                    </text>
                  );
                }
                return null;
              }}
            />
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="key" />}
            className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
