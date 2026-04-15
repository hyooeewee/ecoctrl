import { useEffect, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { locale as t } from "~/locales"
import { cn } from "~/lib/utils"

// ─── Measure hook ─────────────────

function useMeasureWidth(fallback = 700): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const initial = el.getBoundingClientRect().width
    if (initial > 0) setWidth(initial)

    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-white/10 bg-panel-dark/95 px-2 py-1.5 text-[10px] shadow-xl backdrop-blur">
      <span className="text-muted-foreground">{label}{t.charts.trendTimeUnit}</span>
      <span className="ml-2 font-semibold tabular-nums text-foreground">{payload[0].value} kWh</span>
    </div>
  )
}

function PieCustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded border border-white/10 bg-panel-dark/95 px-2 py-1.5 text-[10px] shadow-xl backdrop-blur">
      <span className="font-medium text-foreground">{entry.name}</span>
      <span className="ml-2 tabular-nums text-muted-foreground">{entry.value}%</span>
    </div>
  )
}

// ─── 24-Hour Energy Trend ─────────────────────────────────────────────────────

const trendData = [
  { h: "00", kWh: 180 },
  { h: "02", kWh: 145 },
  { h: "04", kWh: 120 },
  { h: "06", kWh: 160 },
  { h: "08", kWh: 310 },
  { h: "10", kWh: 420 },
  { h: "12", kWh: 480 },
  { h: "14", kWh: 460 },
  { h: "16", kWh: 440 },
  { h: "18", kWh: 410 },
  { h: "20", kWh: 360 },
  { h: "24", kWh: 280 },
]

export function EnergyTrendChart({ className }: { className?: string }) {
  const [ref, width] = useMeasureWidth(700)
  const CHART_H = 148
  const color = "var(--color-chart-1)"

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-white/10 bg-white/6 p-3",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t.charts.trendTitle}
      </p>
      <div ref={ref} className="h-[148px] w-full overflow-hidden">
        <AreaChart
          width={width}
          height={CHART_H}
          data={trendData}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          style={{ outline: "none" }}
        >
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="oklch(1 0 0 / 6%)"
          />
          <XAxis
            dataKey="h"
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
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "oklch(1 0 0 / 10%)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="kWh"
            stroke={color}
            fill="url(#trendGrad)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </div>
    </div>
  )
}

// ─── Energy Breakdown Pie ─────────────────────────────────────────────────────

const breakdownData = [
  { name: t.charts.hvac,      value: 45, color: "var(--color-chart-1)" },
  { name: t.charts.lighting,  value: 30, color: "var(--color-chart-3)" },
  { name: t.charts.equipment, value: 15, color: "var(--color-chart-4)" },
  { name: t.charts.other,     value: 10, color: "oklch(0.35 0.02 265)"  },
]

export function EnergyBreakdownChart({ className }: { className?: string }) {
  const [ref, width] = useMeasureWidth(200)
  const PIE_H = 148

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-white/10 bg-white/6 p-3",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t.charts.breakdownTitle}
      </p>

      <div className="flex items-center gap-4" style={{ height: PIE_H }}>
        <div ref={ref} className="h-full flex-1 overflow-hidden">
          <PieChart
            width={width}
            height={PIE_H}
            style={{ outline: "none" }}
          >
            <Pie
              data={breakdownData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="78%"
              strokeWidth={0}
              isAnimationActive={false}
            >
              {breakdownData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieCustomTooltip />} />
          </PieChart>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {breakdownData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[10px] text-muted-foreground">{entry.name}</span>
              <span className="ml-auto text-[10px] font-semibold tabular-nums text-foreground">
                {entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
