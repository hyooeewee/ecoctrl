import { Activity, PieChart, Sliders, ExternalLink } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ecoctrl/ui";

import { Progress } from "../components/Progress";
import type { EnergyArea } from "@ecoctrl/shared";
import { energyApi } from "../api/energy";

export default function Energy() {
  const [areas, setAreas] = useState<EnergyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await energyApi.areas();
        setAreas(data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAreas();
  }, []);

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList>
        <TabsTrigger value="overview">分区总览</TabsTrigger>
        <TabsTrigger value="details">详细数据</TabsTrigger>
        <TabsTrigger value="stats">统计报表</TabsTrigger>
        <TabsTrigger value="config">分项配置</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-sm text-red-400">
            数据加载失败，请稍后重试
          </div>
        ) : areas.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            暂无能耗分区数据
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {areas.map((area, i) => (
              <Card
                key={i}
                className="border-border bg-card group relative overflow-hidden border shadow-sm"
              >
                <CardHeader className="border-border/50 bg-muted/20 border-b px-6 pb-4">
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-bold">
                      {area.title}
                      <ExternalLink
                        size={14}
                        className="text-muted-foreground hover:text-primary shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </CardTitle>
                    {area.current > area.target ? (
                      <Badge variant="destructive" className="h-5 text-[10px]">
                        超标告警
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 border-green-200 bg-green-50/50 text-[10px] text-green-600"
                      >
                        正常
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">能耗负荷监测</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-6 pt-6 pb-6">
                  <div className="mb-1 flex items-end justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-foreground text-2xl font-bold">
                        {area.current.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">kWh</span>
                    </div>
                    <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      目标: {area.target.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(area.current / area.target) * 100}
                    className="h-1.5"
                    indicatorClassName={area.color}
                  />
                  <div className="border-border/50 grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Activity className="text-primary" size={14} />
                      <span className="text-muted-foreground text-[11px] font-medium">
                        功率因素: {area.powerFactor}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sliders className="text-orange-500" size={14} />
                      <span className="text-muted-foreground text-[11px] font-medium">
                        负载率: {area.loadRate}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border bg-card overflow-hidden border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">今日分项能耗分布</CardTitle>
            <CardDescription className="text-xs">分系统电耗占比分析</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg bg-muted/50">
            <div className="text-center text-muted-foreground">
              <PieChart className="mx-auto mb-2 opacity-30" size={48} />
              <p className="text-sm">饼图组件加载中...</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="details">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">详细数据</CardTitle>
            <CardDescription className="text-xs">各区域能耗明细与历史记录</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">详细数据内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">统计报表</CardTitle>
            <CardDescription className="text-xs">能耗趋势分析与报表导出</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">统计报表内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="config">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 border-b px-6">
            <CardTitle className="text-base font-bold">分项配置</CardTitle>
            <CardDescription className="text-xs">能耗分项模型与阈值设置</CardDescription>
          </CardHeader>
          <CardContent className="mx-6 my-6 flex h-64 items-center justify-center rounded-lg">
            <p className="text-muted-foreground text-sm">分项配置内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
