import {
  IconBolt,
  IconDeviceLaptop,
  IconDevices,
  IconElevator,
  IconWind,
} from "@tabler/icons-react";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

import type { DashboardData } from "~/lib/dashboard-api";
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
        {icon && <span className="text-cyber-cyan">{icon}</span>}
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {title}
        </h3>
      </div>
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

type DeviceCategory = NonNullable<DashboardData["devices"]>[number]["category"];

function getDeviceIcon(category: DeviceCategory) {
  switch (category) {
    case "hvac":
      return <IconWind size={14} />;
    case "lighting":
      return <IconBolt size={14} />;
    case "elevator":
      return <IconElevator size={14} />;
    case "server":
      return <IconDeviceLaptop size={14} />;
  }
}

function getDeviceLabel(category: DeviceCategory, t: ReturnType<typeof useLocale>) {
  switch (category) {
    case "hvac":
      return t.devices.airConditioning;
    case "lighting":
      return t.devices.lighting;
    case "elevator":
      return t.devices.elevators;
    case "server":
      return t.devices.servers;
  }
}

export function DeviceStatusWidget({ data }: { data: DashboardData | null }) {
  const t = useLocale();
  const devices = data?.devices ?? [];
  const total = devices.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader
          title={t.devices.title}
          icon={<IconDevices size={14} />}
          badge={
            total > 0 && (
              <span className="text-muted-foreground rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px]">
                {total}
              </span>
            )
          }
        />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1">
          {devices.map((device, index) => (
            <DeviceItem
              key={`${device.category}-${index}`}
              icon={getDeviceIcon(device.category)}
              label={getDeviceLabel(device.category, t)}
              count={device.count}
              status={device.status}
            />
          ))}
          {devices.length === 0 && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-[11px]">
              {t.charts.noData}
            </div>
          )}
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
