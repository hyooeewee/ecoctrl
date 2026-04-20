import { useEffect, useRef, useState } from "react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

// ─── Measure hook ─────────────────

function useMeasureSize(
  fallbackW = 700,
  fallbackH = 148,
): [React.RefObject<HTMLDivElement | null>, number, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallbackW);
  const [height, setHeight] = useState(fallbackH);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(rect.width);
    if (rect.height > 0) setHeight(rect.height);

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w > 0) setWidth(w);
      if (h > 0) setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width, height];
}

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

function PieCustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded border border-white/10 bg-panel-dark/95 px-2 py-1.5 text-[10px] shadow-xl backdrop-blur">
      <span className="font-medium text-foreground">{entry.name}</span>
      <span className="ml-2 tabular-nums text-muted-foreground">{entry.value}%</span>
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
  const [ref, width, height] = useMeasureSize(700, 148);
  const color = "var(--color-chart-1)";

  const chartData = data.map((d, i) => ({ ...d, t: i }));

  return (
    <div className={cn("flex h-full flex-col gap-2 p-3", className)}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--color-chart-1)" }}>{icon}</span>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>
      <div ref={ref} className="min-h-0 w-full flex-1 overflow-hidden">
        {chartType === "area" && (
          <AreaChart
            width={width}
            height={height}
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            style={{ outline: "none" }}
          >
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
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
            <Tooltip
              content={<TrendTooltip timeUnit={t.charts.trendTimeUnit} />}
              cursor={{ stroke: "oklch(1 0 0 / 10%)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill="url(#trendGrad)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        )}

        {chartType === "line" && (
          <LineChart
            width={width}
            height={height}
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            style={{ outline: "none" }}
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
            <Tooltip
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
            width={width}
            height={height}
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            style={{ outline: "none" }}
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
            <Tooltip
              content={<TrendTooltip timeUnit={t.charts.trendTimeUnit} />}
              cursor={{ fill: "oklch(1 0 0 / 5%)" }}
            />
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </div>
    </div>
  );
}

// ─── Energy Breakdown Pie ─────────────────────────────────────────────────────

interface BreakdownItem {
  label: string;
  value: number;
  color: string;
}

interface EnergyBreakdownChartProps {
  className?: string;
  data: BreakdownItem[];
  title: string;
  icon: React.ReactNode;
}

export function EnergyBreakdownChart({ className, data, title, icon }: EnergyBreakdownChartProps) {
  const [ref, width] = useMeasureSize(200, 148);

  return (
    <div className={cn("flex h-full flex-col gap-2 p-3", className)}>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--color-chart-3)" }}>{icon}</span>
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-4">
        <div ref={ref} className="h-full flex-1 overflow-hidden">
          <PieChart width={width} height={width} style={{ outline: "none" }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="78%"
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieCustomTooltip />} />
          </PieChart>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {data.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] text-muted-foreground">{entry.label}</span>
              <span className="ml-auto text-[10px] font-semibold tabular-nums text-foreground">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
