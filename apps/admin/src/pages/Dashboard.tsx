import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Zap, 
  Activity, 
  AlertCircle, 
  Droplets,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { ALERTS, ENERGY_CHART_DATA } from '../constants/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const Indicator = ({ title, value, unit, trend, trendType, icon: Icon, color, isGood = true }: any) => {
  const isTrendPositive = trendType === 'up';
  const isTrendNegative = trendType === 'down';
  
  // Determine trend color based on semantics (e.g., alerts down is GOOD)
  let trendColorClass = "text-slate-500";
  if (isTrendPositive) {
    trendColorClass = isGood ? "text-emerald-600" : "text-rose-600";
  } else if (isTrendNegative) {
    trendColorClass = isGood ? "text-rose-600" : "text-emerald-600";
  }

  return (
    <Card className="border border-border shadow-sm bg-card overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title} ({unit})</p>
            <div className={cn("p-2 rounded-md transition-colors group-hover:bg-primary/10", color.replace('text-', 'bg-').concat('/10'))}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</h3>
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-bold",
              trendColorClass
            )}>
              {trendType === 'up' ? "↑" : trendType === 'down' ? "↓" : "—"}
              {trend} <span className="text-muted-foreground font-medium ml-0.5 whitespace-nowrap">较上月同期</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import { cn } from '@/lib/utils';

export default function DashboardContent() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Indicator 
          title="总能耗" 
          value="12,840" 
          unit="kWh" 
          trend="+12%" 
          trendType="up"
          icon={Zap} 
          color="text-amber-500"
          isGood={false}
        />
        <Indicator 
          title="设备在线率" 
          value="98.2" 
          unit="%" 
          trend="+0.5%" 
          trendType="up"
          icon={Activity} 
          color="text-blue-500"
          isGood={true}
        />
        <Indicator 
          title="未处理告警" 
          value="04" 
          unit="项" 
          trend="-2" 
          trendType="down"
          icon={AlertCircle} 
          color="text-rose-500"
          isGood={false}
        />
        <Indicator 
          title="本月碳排" 
          value="842" 
          unit="kg" 
          trend="-4.2%" 
          trendType="down"
          icon={Droplets} 
          color="text-emerald-500"
          isGood={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border shadow-sm bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between px-6 pb-8 border-b border-border/50">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-foreground">近一周能耗趋势 (分项)</CardTitle>
              <CardDescription className="text-xs">2024年3月14日 - 2024年3月20日</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm shadow-primary/20"></div>
                <span className="text-[11px] font-medium text-muted-foreground">照明</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <span className="text-[11px] font-medium text-muted-foreground">空调</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 px-6">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ENERGY_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
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
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between px-6 pb-4 border-b border-border/50">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-foreground">实时告警列表</CardTitle>
            </div>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                console.log('Navigate to all alerts');
              }}
              className="text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              查看全部
            </a>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground py-3 px-6">设备名称</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground py-3">级别</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground py-3 text-right pr-6">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALERTS.slice(0, 5).map((alert) => (
                  <TableRow key={alert.id} className="group hover:bg-muted/50 border-border">
                    <TableCell className="py-4 px-6">
                      <span className="text-sm font-medium text-foreground">{alert.device}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={cn(
                        "status-badge px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tight",
                        alert.level === 'high' 
                          ? "bg-red-100 text-red-700" 
                          : "bg-orange-100 text-orange-700"
                      )}>
                        {alert.level === 'high' ? '紧急' : '次要'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <span className="text-xs text-muted-foreground">未处理</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access / Bottom Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/30 p-6 rounded-md border border-border">
        <div className="flex flex-wrap gap-8 mb-4 sm:mb-0">
          <div className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">系统状态:</span> 
            <span className="text-foreground font-semibold">正常运行中</span>
          </div>
          <div className="text-sm flex items-center gap-2 pl-4 border-l border-border/50">
            <span className="text-muted-foreground">下次备份:</span> 
            <span className="text-foreground font-medium">2023-11-20 03:00</span>
          </div>
        </div>
        <Dialog>
          <DialogTrigger render={
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 px-6 h-9"
            >
              导出今日报表
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>导出今日能耗报表</DialogTitle>
              <DialogDescription>
                请确认报表导出信息，系统将根据选定参数生成文件。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 p-4 pl-[17px]">
              <div className="grid gap-2">
                <Label htmlFor="reportName">报表名称</Label>
                <Input id="reportName" placeholder="今日能耗概览_20240320" defaultValue="今日能耗概览_20240320" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exportFormat">导出格式</Label>
                <Input id="exportFormat" placeholder="PDF / EXCEL / CSV" defaultValue="PDF" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="operator">操作人</Label>
                <Input id="operator" placeholder="系统管理员" defaultValue="系统管理员" />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                onClick={() => {
                  const name = (document.getElementById('reportName') as HTMLInputElement)?.value || '今日能耗概览_20240320';
                  console.log('Exporting today report:', name);
                  // Success feedback via console for now
                }}
              >
                确认导出
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
