import { cn } from "~/lib/utils";
import { getNestedLocaleValue, getWidgetTitle, useLocale } from "~/locales";

import { DynamicIcon } from "./dynamic-icon";
import type { WidgetConfig, ListData } from "./types";

interface ListWidgetProps {
  widget: WidgetConfig;
  data: ListData;
}

function detectListType(items: Record<string, unknown>[]): "devices" | "alerts" | "ai" | "generic" {
  if (items.length === 0) return "generic";
  const first = items[0];
  if ("status" in first && "label" in first) return "devices";
  if ("severity" in first && "time" in first) return "alerts";
  if ("text" in first) return "ai";
  return "generic";
}

// ─── Shared SectionHeader ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  icon,
  badge,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-cyber-cyan">{icon}</span>}
        <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground">{title}</h3>
      </div>
      {badge}
    </div>
  );
}

// ─── Device List ──────────────────────────────────────────────────────────────

function DeviceItem({
  icon,
  label,
  count,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  status: string;
}) {
  const dotColor =
    {
      ok: "bg-cyber-green shadow-[0_0_6px_#22c55e]",
      warn: "bg-cyber-amber shadow-[0_0_6px_#f59e0b]",
      critical: "bg-cyber-red   shadow-[0_0_6px_#ef4444]",
    }[status] ?? "bg-muted-foreground";

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-[11px] font-medium text-foreground/80">{label}</span>
      <span className="font-heading text-sm font-bold tabular-nums text-foreground">{count}</span>
      <span className={cn("size-2 rounded-full", dotColor)} />
    </div>
  );
}

function DeviceListWidget({
  widget,
  data,
  title,
}: {
  widget: WidgetConfig;
  data: ListData;
  title: string;
}) {
  const t = useLocale();
  const items = data.items as Array<{
    icon: string;
    label: string;
    value: number;
    status: string;
  }>;
  const total = items.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={title}
          icon={<DynamicIcon name={widget.icon} size={14} />}
          badge={
            total > 0 && (
              <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {total}
              </span>
            )
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1">
          {items.map((device) => (
            <DeviceItem
              key={device.label}
              icon={<DynamicIcon name={device.icon} size={14} />}
              label={getNestedLocaleValue(t, device.label) ?? device.label}
              count={device.value}
              status={device.status}
            />
          ))}
          {items.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
              {t.charts.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Alert List ───────────────────────────────────────────────────────────────

function AlertItem({
  icon,
  title,
  subtitle,
  severity,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  severity: string;
  time: string;
}) {
  const accentColor =
    {
      critical: "border-l-cyber-red   bg-cyber-red/5",
      warning: "border-l-cyber-amber bg-cyber-amber/5",
      info: "border-l-chart-1     bg-chart-1/5",
    }[severity] ?? "border-l-muted-foreground bg-white/5";

  const iconColor =
    {
      critical: "text-cyber-red",
      warning: "text-cyber-amber",
      info: "text-chart-1",
    }[severity] ?? "text-muted-foreground";

  return (
    <div className={cn("flex items-start gap-2 rounded-r-lg border-l-2 px-2 py-1.5", accentColor)}>
      <span className={cn("mt-0.5 shrink-0", iconColor)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-foreground/90">{title}</p>
        <p className="truncate text-[9px] text-muted-foreground">{subtitle}</p>
      </div>
      <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/60">{time}</span>
    </div>
  );
}

function AlertListWidget({
  widget,
  data,
  title,
}: {
  widget: WidgetConfig;
  data: ListData;
  title: string;
}) {
  const t = useLocale();
  const items = data.items as Array<{
    icon: string;
    title: string;
    subtitle: string;
    severity: string;
    time: string;
  }>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={title}
          icon={<DynamicIcon name={widget.icon} size={14} className="text-cyber-red" />}
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1">
          {items.map((alert) => (
            <AlertItem
              key={alert.title}
              icon={<DynamicIcon name={alert.icon} size={12} />}
              title={alert.title}
              subtitle={alert.subtitle}
              severity={alert.severity}
              time={alert.time}
            />
          ))}
          {items.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
              {t.charts.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Suggestion List ───────────────────────────────────────────────────────

function SuggestionItem({
  icon,
  text,
  saving,
}: {
  icon: React.ReactNode;
  text: string;
  saving?: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-cyber-cyan/15 bg-cyber-cyan/5 px-2.5 py-2">
      <span className="mt-0.5 shrink-0 text-cyber-cyan">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-snug text-foreground/80">{text}</p>
        {saving && <p className="mt-0.5 text-[9px] font-semibold text-cyber-green">↓ {saving}</p>}
      </div>
    </div>
  );
}

function AiListWidget({
  widget,
  data,
  title,
}: {
  widget: WidgetConfig;
  data: ListData;
  title: string;
}) {
  const t = useLocale();
  const items = data.items as Array<{
    icon: string;
    text: string;
    saving?: string;
  }>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader title={title} icon={<DynamicIcon name={widget.icon} size={14} />} />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <SuggestionItem
              key={item.text}
              icon={<DynamicIcon name={item.icon} size={12} />}
              text={item.text}
              saving={item.saving}
            />
          ))}
          {items.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
              {t.charts.noData}
            </div>
          )}
        </div>

        {/* AI globe decoration */}
        <div className="flex justify-center pt-2">
          <div className="relative flex size-14 items-center justify-center">
            <div className="absolute size-14 animate-ping rounded-full border border-cyber-cyan/20" />
            <div className="absolute size-10 animate-pulse rounded-full border border-cyber-cyan/30" />
            <div className="relative flex size-9 items-center justify-center rounded-full border border-cyber-cyan/50 bg-cyber-cyan/10">
              <DynamicIcon name={widget.icon} size={16} className="text-cyber-cyan" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic List (fallback) ──────────────────────────────────────────────────

function GenericListWidget({
  widget,
  data,
  title,
}: {
  widget: WidgetConfig;
  data: ListData;
  title: string;
}) {
  const t = useLocale();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader title={title} icon={<DynamicIcon name={widget.icon} size={14} />} />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1">
          {data.items.map((item) => (
            <div
              key={JSON.stringify(item)}
              className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5 text-[11px]"
            >
              {JSON.stringify(item)}
            </div>
          ))}
          {data.items.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">
              {t.charts.noData}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Entry ────────────────────────────────────────────────────────────────────

export function ListWidget({ widget, data }: ListWidgetProps) {
  const t = useLocale();
  const title = getWidgetTitle(t, widget.metricKey);
  const type = detectListType(data.items);

  switch (type) {
    case "devices":
      return <DeviceListWidget widget={widget} data={data} title={title} />;
    case "alerts":
      return <AlertListWidget widget={widget} data={data} title={title} />;
    case "ai":
      return <AiListWidget widget={widget} data={data} title={title} />;
    default:
      return <GenericListWidget widget={widget} data={data} title={title} />;
  }
}
