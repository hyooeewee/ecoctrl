import { type ReactNode, useEffect, useRef, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
} from "recharts"

import { Card, CardContent } from "~/components/ui/card"
import {
  Progress,
  ProgressIndicator,
  ProgressTrack,
} from "~/components/ui/progress"
import { cn } from "~/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type DeltaVariant = "up-good" | "up-bad" | "down-good" | "down-bad" | "neutral"

interface SparkPoint {
  v: number
}

interface GraphButtonBlockProps {
  title: string
  icon?: ReactNode
  value: string
  unit: string
  delta?: string
  deltaVariant?: DeltaVariant
  chartType: "area" | "bar" | "line" | "progress"
  chartData?: SparkPoint[]
  progressValue?: number // 0-100
  chartColor: string    // CSS color value passed directly to recharts / indicator
  footer?: ReactNode
  className?: string
}

// ─── Delta styling map ─────────────────────────────────────────────────────────

const deltaStyle: Record<DeltaVariant, string> = {
  "up-good":   "bg-cyber-green/15 text-cyber-green  border-cyber-green/30",
  "up-bad":    "bg-cyber-red/15   text-cyber-red    border-cyber-red/30",
  "down-good": "bg-cyber-green/15 text-cyber-green  border-cyber-green/30",
  "down-bad":  "bg-cyber-amber/15 text-cyber-amber  border-cyber-amber/30",
  "neutral":   "bg-white/5        text-muted-foreground border-white/10",
}

// ─── Measure hook ─────────────────────────────────────────────────────────────

// Measures the container element so recharts can receive explicit px dimensions.
// ResponsiveContainer in recharts 3.x uses a 0×0 internal sentinel div whose
// ResizeObserver always fires with 0, so we bypass it entirely.
function useMeasureWidth(fallback = 240): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Read immediately on mount
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

// ─── Mini charts ──────────────────────────────────────────────────────────────

const CHART_H = 36
const MICRO_H = 20

function MiniArea({ data, color }: { data: SparkPoint[]; color: string }) {
  const [ref, width] = useMeasureWidth()
  // Stable gradient id derived from color string — avoids hydration mismatch
  const gradId = `mini-area-${color.replace(/[^a-z0-9]/gi, "x")}`
  return (
    <div ref={ref} className="h-[36px] w-full overflow-hidden">
      <AreaChart width={width} height={CHART_H} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          fill={`url(#${gradId})`}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  )
}

function MiniBar({ data, color }: { data: SparkPoint[]; color: string }) {
  const [ref, width] = useMeasureWidth()
  return (
    <div ref={ref} className="h-[36px] w-full overflow-hidden">
      <BarChart width={width} height={CHART_H} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barSize={4}>
        <Bar
          dataKey="v"
          fill={color}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </div>
  )
}

function MiniLine({ data, color }: { data: SparkPoint[]; color: string }) {
  const [ref, width] = useMeasureWidth()
  return (
    <div ref={ref} className="h-[36px] w-full overflow-hidden">
      <LineChart width={width} height={CHART_H} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  )
}

function MiniProgress({
  data,
  value,
  color,
}: {
  data: SparkPoint[]
  value: number
  color: string
}) {
  const [ref, width] = useMeasureWidth()
  return (
    <div className="flex flex-col gap-1.5">
      {data.length > 0 && (
        <div ref={ref} className="h-[20px] w-full overflow-hidden">
          <LineChart width={width} height={MICRO_H} data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </div>
      )}
      <Progress value={value} className="gap-0">
        <ProgressTrack className="h-1.5">
          <ProgressIndicator style={{ backgroundColor: color }} />
        </ProgressTrack>
      </Progress>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GraphButtonBlock({
  title,
  icon,
  value,
  unit,
  delta,
  deltaVariant = "neutral",
  chartType,
  chartData = [],
  progressValue,
  chartColor,
  footer,
  className,
}: GraphButtonBlockProps) {
  return (
    <Card
      className={cn(
        // py-0 overrides the Card's default py-4, so CardContent owns all padding
        "relative overflow-hidden rounded-xl border-white/10 bg-white/6 py-0 backdrop-blur-sm",
        className,
      )}
    >
      {/* Top accent glow derived from chart color */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 opacity-30"
        style={{
          background: `linear-gradient(to bottom, ${chartColor}40, transparent)`,
        }}
      />

      <CardContent className="relative flex h-full flex-col gap-1.5 px-3 py-2">
        {/* ── Row 1: icon · title · delta ── */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {icon && (
              <span
                className="flex size-[14px] shrink-0 items-center justify-center"
                style={{ color: chartColor }}
              >
                {icon}
              </span>
            )}
            <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground">
              {title}
            </span>
          </div>
          {delta && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold",
                deltaStyle[deltaVariant],
              )}
            >
              {delta}
            </span>
          )}
        </div>

        {/* ── Row 2: value · unit ── */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-xl font-bold tabular-nums leading-none text-foreground">
            {value}
          </span>
          <span className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
            {unit}
          </span>
        </div>

        {/* ── Row 3: chart — shrink-0 so it's never crushed by flex ── */}
        <div className="shrink-0">
          {chartType === "area" && (
            <MiniArea data={chartData} color={chartColor} />
          )}
          {chartType === "bar" && (
            <MiniBar data={chartData} color={chartColor} />
          )}
          {chartType === "line" && (
            <MiniLine data={chartData} color={chartColor} />
          )}
          {chartType === "progress" && progressValue !== undefined && (
            <MiniProgress data={chartData} value={progressValue} color={chartColor} />
          )}
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-white/6" />

        {/* ── Row 4: footer ── */}
        {footer && (
          <div className="text-[9px] leading-none text-muted-foreground">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
