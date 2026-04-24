import { Zap, Activity, AlertCircle, Droplets } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import AppButton from "@/components/AppButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui";

import { cn } from "@/lib/utils";
import ExportDialog from "../components/ExportDialog";
import type { Alert } from "@ecoctrl/shared";
import type { BackupSchedule } from "@ecoctrl/shared";
import { overviewApi } from "../api/overview";

interface OverviewStats {
  totalEnergy: { value: string; unit: string; trend: string; trendType: "up" | "down" | "neutral" };
  onlineRate: { value: string; unit: string; trend: string; trendType: "up" | "down" | "neutral" };
  pendingAlerts: {
    value: string;
    unit: string;
    trend: string;
    trendType: "up" | "down" | "neutral";
  };
  carbonEmission: {
    value: string;
    unit: string;
    trend: string;
    trendType: "up" | "down" | "neutral";
  };
}

const Indicator = ({
  title,
  value,
  unit,
  trend,
  trendType,
  icon: Icon,
  color,
  isGood = true,
}: any) => {
  const isTrendPositive = trendType === "up";
  const isTrendNegative = trendType === "down";

  let trendColorClass = "text-muted-foreground";
  if (isTrendPositive) {
    trendColorClass = isGood ? "text-emerald-600" : "text-rose-600";
  } else if (isTrendNegative) {
    trendColorClass = isGood ? "text-rose-600" : "text-emerald-600";
  }

  return (
    <Card className="border-border bg-card group hover:border-primary/20 overflow-hidden border shadow-sm transition-all duration-300 hover:shadow-md">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
              {title} ({unit})
            </p>
            <div
              className={cn(
                "group-hover:bg-primary/10 rounded-md p-2 transition-colors",
                color.replace("text-", "bg-").concat("/10"),
              )}
            >
              <Icon className={cn("h-4 w-4", color)} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground text-2xl font-bold tracking-tight tabular-nums">
              {value}
            </h3>
            <div className={cn("flex items-center gap-1 text-[11px] font-bold", trendColorClass)}>
              {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "—"}
              {trend}{" "}
              <span className="text-muted-foreground ml-0.5 font-medium whitespace-nowrap">
                较上月同期
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function formatDateRange(data: { name: string; value: number }[]) {
  if (data.length === 0) return "暂无数据";
  const first = data[0].name;
  const last = data[data.length - 1].name;
  return `${first} - ${last}`;
}

export default function OverviewContent() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [energyData, setEnergyData] = useState<{ name: string; value: number }[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, energyData, alertsData, backupData] = await Promise.all([
          overviewApi.stats(),
          overviewApi.energyChart(),
          overviewApi.alerts(),
          overviewApi.backupSchedule(),
        ]);
        setStats(statsData);
        setEnergyData(energyData);
        setAlerts(alertsData);
        setBackupSchedule(backupData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats && (
          <>
            <Indicator
              title="总能耗"
              value={stats.totalEnergy.value}
              unit={stats.totalEnergy.unit}
              trend={stats.totalEnergy.trend}
              trendType={stats.totalEnergy.trendType}
              icon={Zap}
              color="text-amber-500"
              isGood={false}
            />
            <Indicator
              title="设备在线率"
              value={stats.onlineRate.value}
              unit={stats.onlineRate.unit}
              trend={stats.onlineRate.trend}
              trendType={stats.onlineRate.trendType}
              icon={Activity}
              color="text-blue-500"
              isGood={true}
            />
            <Indicator
              title="未处理告警"
              value={stats.pendingAlerts.value}
              unit={stats.pendingAlerts.unit}
              trend={stats.pendingAlerts.trend}
              trendType={stats.pendingAlerts.trendType}
              icon={AlertCircle}
              color="text-rose-500"
              isGood={false}
            />
            <Indicator
              title="本月碳排"
              value={stats.carbonEmission.value}
              unit={stats.carbonEmission.unit}
              trend={stats.carbonEmission.trend}
              trendType={stats.carbonEmission.trendType}
              icon={Droplets}
              color="text-emerald-500"
              isGood={false}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card overflow-hidden border shadow-sm lg:col-span-2">
          <CardHeader className="border-border/50 flex flex-row items-center justify-between border-b px-6 pb-8">
            <div className="space-y-1">
              <CardTitle className="text-foreground text-base font-bold">
                近一周能耗趋势 (分项)
              </CardTitle>
              <CardDescription className="text-xs">{formatDateRange(energyData)}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="bg-primary shadow-primary/20 h-2.5 w-2.5 rounded-full shadow-sm"></div>
                <span className="text-muted-foreground text-[11px] font-medium">照明</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground"></div>
                <span className="text-muted-foreground text-[11px] font-medium">空调</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pt-8">
            <div className="h-[280px] w-full">
              {energyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={energyData}>
                    <defs>
                      <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorPrimary)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card flex flex-col overflow-hidden border shadow-sm">
          <CardHeader className="border-border/50 flex flex-row items-center justify-between border-b px-6 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-foreground text-base font-bold">实时告警列表</CardTitle>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                console.log("Navigate to all alerts");
              }}
              className="text-primary text-xs font-semibold underline-offset-4 hover:underline"
            >
              查看全部
            </a>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground px-6 py-3 text-[10px] font-bold tracking-wider uppercase">
                    设备名称
                  </TableHead>
                  <TableHead className="text-muted-foreground py-3 text-[10px] font-bold tracking-wider uppercase">
                    级别
                  </TableHead>
                  <TableHead className="text-muted-foreground py-3 pr-6 text-right text-[10px] font-bold tracking-wider uppercase">
                    状态
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      暂无告警
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => (
                    <TableRow key={alert.id} className="group hover:bg-muted/50 border-border">
                      <TableCell className="px-6 py-4">
                        <span className="text-foreground text-sm font-medium">{alert.device}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span
                          className={cn(
                            "status-badge rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase",
                            alert.level === "high"
                              ? "bg-red-100 text-red-700"
                              : "bg-orange-100 text-orange-700",
                          )}
                        >
                          {alert.level === "high" ? "紧急" : "次要"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 pr-6 text-right">
                        <span className="text-muted-foreground text-xs">
                          {alert.status === "pending" ? "未处理" : "已处理"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/30 border-border flex flex-col items-center justify-between rounded-md border p-6 sm:flex-row">
        <div className="mb-4 flex flex-wrap gap-8 sm:mb-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground">系统状态:</span>
            <span className="text-foreground font-semibold">正常运行中</span>
          </div>
          <div className="border-border/50 flex items-center gap-2 border-l pl-4 text-sm">
            <span className="text-muted-foreground">下次备份:</span>
            <span className="text-foreground font-medium">
              {backupSchedule?.nextBackup ?? "--"}
            </span>
          </div>
        </div>
        <ExportDialog
          trigger={
            <AppButton level="action" className="h-9 px-6">
              导出今日报表
            </AppButton>
          }
          title="导出今日能耗报表"
          description="请确认报表导出信息，系统将根据选定参数生成文件。"
          defaultFileName={`今日能耗概览_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`}
          defaultFormat="PDF"
          defaultOperator="系统管理员"
          onExport={({ fileName }) => {
            const lines: string[] = [];
            lines.push("指标,数值,单位,趋势");
            if (stats) {
              lines.push(
                `总能耗,${stats.totalEnergy.value},${stats.totalEnergy.unit},${stats.totalEnergy.trend}`,
              );
              lines.push(
                `设备在线率,${stats.onlineRate.value},${stats.onlineRate.unit},${stats.onlineRate.trend}`,
              );
              lines.push(
                `未处理告警,${stats.pendingAlerts.value},${stats.pendingAlerts.unit},${stats.pendingAlerts.trend}`,
              );
              lines.push(
                `本月碳排,${stats.carbonEmission.value},${stats.carbonEmission.unit},${stats.carbonEmission.trend}`,
              );
            }
            lines.push("");
            lines.push("能耗趋势");
            lines.push("时间,数值(kWh)");
            energyData.forEach((d) => lines.push(`${d.name},${d.value}`));
            lines.push("");
            lines.push("实时告警");
            lines.push("设备,级别,状态,时间");
            alerts.forEach((a) => lines.push(`${a.device},${a.level},${a.status},${a.time}`));
            const csvContent = lines.join("\n");
            const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${fileName}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        />
      </div>
    </div>
  );
}
