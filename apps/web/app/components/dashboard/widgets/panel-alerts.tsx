import {
  IconAlertTriangle,
  IconBell,
  IconFlame,
  IconTemperature,
  IconWind,
} from "@tabler/icons-react";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

import type { DashboardWidget } from "./types";

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
        {icon && <span className="text-cyber-red">{icon}</span>}
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {title}
        </h3>
      </div>
      {badge}
    </div>
  );
}

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
        <p className="text-foreground/90 truncate text-[11px] font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-[9px]">{subtitle}</p>
      </div>
      <span className="text-muted-foreground/60 shrink-0 text-[9px] tabular-nums">{time}</span>
    </div>
  );
}

export function AlertsWidget() {
  const t = useLocale();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.alerts.title}
          icon={<IconBell size={14} />}
          badge={
            <span className="border-cyber-red/30 bg-cyber-red/10 text-cyber-red inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold">
              <span className="bg-cyber-red size-1.5 animate-pulse rounded-full" />
              {t.alerts.active}
            </span>
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
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
    </div>
  );
}

export const alertsWidget: DashboardWidget = {
  id: "panel-alerts",
  title: (t) => t.bentoWidgets["panel-alerts"],
  defaultLayout: { x: 14, y: 1, w: 3, h: 2 },
  component: AlertsWidget,
};
