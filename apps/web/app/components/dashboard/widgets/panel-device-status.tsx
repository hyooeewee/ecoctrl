import { IconBolt, IconDeviceLaptop, IconElevator, IconWind } from "@tabler/icons-react";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

import type { DashboardWidget } from "./types";

function SectionHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
        {title}
      </h3>
      {badge}
    </div>
  );
}

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
      <span className="text-foreground/80 flex-1 text-[11px] font-medium">{label}</span>
      <span className="font-heading text-foreground text-sm font-bold tabular-nums">{count}</span>
      <span className={cn("size-2 rounded-full", dotColor)} />
    </div>
  );
}

export function DeviceStatusWidget() {
  const t = useLocale();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.devices.title}
          badge={
            <span className="text-muted-foreground rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px]">
              {t.devices.total}
            </span>
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
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
    </div>
  );
}

export const deviceStatusWidget: DashboardWidget = {
  id: "panel-devices",
  title: (t) => t.bentoWidgets["panel-devices"],
  defaultLayout: { x: 14, y: 3, w: 3, h: 3 },
  component: DeviceStatusWidget,
};
