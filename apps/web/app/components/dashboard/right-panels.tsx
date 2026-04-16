import {
  IconActivity,
  IconAi,
  IconAlertTriangle,
  IconBolt,
  IconBulb,
  IconDeviceLaptop,
  IconElevator,
  IconFlame,
  IconTemperature,
  IconWind,
} from "@tabler/icons-react";

import { useLocale } from "~/locales";
import { cn } from "~/lib/utils";

// ─── Shared bento card wrapper ─────────────────────────────────────────────────

function BentoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {badge}
    </div>
  );
}

// ─── Device Status ─────────────────────────────────────────────────────────────

interface DeviceItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  status: "ok" | "warn" | "critical";
}

function DeviceItem({ icon, label, count, status }: DeviceItemProps) {
  const dotColor = {
    ok: "bg-cyber-green shadow-[0_0_6px_#22c55e]",
    warn: "bg-cyber-amber shadow-[0_0_6px_#f59e0b]",
    critical: "bg-cyber-red   shadow-[0_0_6px_#ef4444]",
  }[status];

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/4 px-2.5 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-[11px] font-medium text-foreground/80">{label}</span>
      <span className="font-heading text-sm font-bold tabular-nums text-foreground">{count}</span>
      <span className={cn("size-2 rounded-full", dotColor)} />
    </div>
  );
}

export function DeviceStatus() {
  const t = useLocale();
  return (
    <BentoCard>
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.devices.title}
          badge={
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {t.devices.total}
            </span>
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <div className="flex flex-col gap-1">
          <DeviceItem
            icon={<IconWind size={14} />}
            label={t.devices.airConditioning}
            count={6}
            status="critical"
          />
          <DeviceItem
            icon={<IconBolt size={14} />}
            label={t.devices.lighting}
            count={30}
            status="warn"
          />
          <DeviceItem
            icon={<IconElevator size={14} />}
            label={t.devices.elevators}
            count={10}
            status="ok"
          />
          <DeviceItem
            icon={<IconDeviceLaptop size={14} />}
            label={t.devices.servers}
            count={24}
            status="ok"
          />
        </div>
      </div>
    </BentoCard>
  );
}

// ─── Real-time Alerts ─────────────────────────────────────────────────────────

interface AlertItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  severity: "critical" | "warning" | "info";
  time: string;
}

function AlertItem({ icon, title, subtitle, severity, time }: AlertItemProps) {
  const accentColor = {
    critical: "border-l-cyber-red   bg-cyber-red/5",
    warning: "border-l-cyber-amber bg-cyber-amber/5",
    info: "border-l-chart-1     bg-chart-1/5",
  }[severity];

  const iconColor = {
    critical: "text-cyber-red",
    warning: "text-cyber-amber",
    info: "text-chart-1",
  }[severity];

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

export function AlertsPanel() {
  const t = useLocale();
  return (
    <BentoCard>
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.alerts.title}
          badge={
            <span className="inline-flex items-center gap-1 rounded border border-cyber-red/30 bg-cyber-red/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyber-red">
              <span className="size-1.5 animate-pulse rounded-full bg-cyber-red" />
              {t.alerts.active}
            </span>
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <div className="flex flex-col gap-1">
          <AlertItem
            icon={<IconTemperature size={12} />}
            title={t.alerts.serverTempTitle}
            subtitle={t.alerts.serverTempSub}
            severity="critical"
            time="02:14"
          />
          <AlertItem
            icon={<IconWind size={12} />}
            title={t.alerts.hvacWarnTitle}
            subtitle={t.alerts.hvacWarnSub}
            severity="warning"
            time="05:32"
          />
          <AlertItem
            icon={<IconFlame size={12} />}
            title={t.alerts.powerSurgeTitle}
            subtitle={t.alerts.powerSurgeSub}
            severity="warning"
            time="12:07"
          />
          <AlertItem
            icon={<IconAlertTriangle size={12} />}
            title={t.alerts.upsBatteryTitle}
            subtitle={t.alerts.upsBatterySub}
            severity="critical"
            time="14:55"
          />
        </div>
      </div>
    </BentoCard>
  );
}

// ─── AI Optimization Suggestions ──────────────────────────────────────────────

interface SuggestionItemProps {
  icon: React.ReactNode;
  text: string;
  saving?: string;
}

function SuggestionItem({ icon, text, saving }: SuggestionItemProps) {
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

export function AISuggestions() {
  const t = useLocale();
  return (
    <BentoCard>
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader title={t.ai.title} />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
        <div className="flex flex-col gap-1.5">
          <SuggestionItem
            icon={<IconWind size={12} />}
            text={t.ai.hvacText}
            saving={t.ai.hvacSaving}
          />
          <SuggestionItem
            icon={<IconBulb size={12} />}
            text={t.ai.lightingText}
            saving={t.ai.lightingSaving}
          />
          <SuggestionItem
            icon={<IconActivity size={12} />}
            text={t.ai.serverText}
            saving={t.ai.serverSaving}
          />
        </div>

        {/* AI globe decoration */}
        <div className="flex justify-center pt-2">
          <div className="relative flex size-14 items-center justify-center">
            <div className="absolute size-14 animate-ping rounded-full border border-cyber-cyan/20" />
            <div className="absolute size-10 animate-pulse rounded-full border border-cyber-cyan/30" />
            <div className="relative flex size-9 items-center justify-center rounded-full border border-cyber-cyan/50 bg-cyber-cyan/10">
              <IconAi size={16} className="text-cyber-cyan" />
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
