import {
  IconAlertTriangle,
  IconBell,
  IconExclamationCircle,
  IconInfoCircle,
} from "@tabler/icons-react";

import type { DashboardData } from "~/lib/dashboard-api";
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

function getSeverityIcon(severity: "critical" | "warning" | "info") {
  switch (severity) {
    case "critical":
      return <IconAlertTriangle size={12} />;
    case "warning":
      return <IconExclamationCircle size={12} />;
    case "info":
      return <IconInfoCircle size={12} />;
  }
}

function mapLevelToSeverity(level: "high" | "medium" | "low"): "critical" | "warning" | "info" {
  switch (level) {
    case "high":
      return "critical";
    case "medium":
      return "warning";
    case "low":
      return "info";
  }
}

export function AlertsWidget({ data }: { data: DashboardData | null }) {
  const t = useLocale();
  const alerts = data?.alerts ?? [];
  const activeCount = alerts.filter((a) => a.status === "pending").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.alerts.title}
          icon={<IconBell size={14} />}
          badge={
            activeCount > 0 && (
              <span className="border-cyber-red/30 bg-cyber-red/10 text-cyber-red inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold">
                <span className="bg-cyber-red size-1.5 animate-pulse rounded-full" />
                {activeCount} {t.alerts.activeSuffix}
              </span>
            )
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1">
          {alerts.map((alert) => {
            const severity = mapLevelToSeverity(alert.level);
            return (
              <AlertItem
                key={alert.id}
                icon={getSeverityIcon(severity)}
                title={alert.message}
                subtitle={alert.device}
                severity={severity}
                time={alert.time}
              />
            );
          })}
          {alerts.length === 0 && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-[11px]">
              {t.charts.noData}
            </div>
          )}
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
