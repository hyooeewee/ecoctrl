import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "../components/Progress";
import { Badge } from "@/components/ui/badge";
import { Activity, PieChart, Sliders, ExternalLink } from "lucide-react";

export default function Energy() {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">能耗管理</h1>
        </div>

        <TabsList>
          <TabsTrigger value="overview">分区总览</TabsTrigger>
          <TabsTrigger value="details">详细数据</TabsTrigger>
          <TabsTrigger value="stats">统计报表</TabsTrigger>
          <TabsTrigger value="config">分项配置</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "A 栋办公区", current: 4200, target: 5000, color: "bg-primary" },
            { title: "B 栋研发中心", current: 8500, target: 7000, color: "bg-red-500" },
            { title: "C 栋生产车间", current: 15400, target: 20000, color: "bg-green-500" },
          ].map((area, i) => (
            <Card
              key={i}
              className="border border-border shadow-sm overflow-hidden bg-card group relative"
            >
              <CardHeader className="pb-4 border-b border-border/50 bg-muted/20 px-6">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {area.title}
                    <ExternalLink
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary cursor-pointer shrink-0"
                    />
                  </CardTitle>
                  {area.current > area.target ? (
                    <Badge variant="destructive" className="h-5 text-[10px]">
                      超标告警
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-5 text-[10px] text-green-600 bg-green-50/50 border-green-200"
                    >
                      正常
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">能耗负荷监测</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6 px-6 pb-6">
                <div className="flex justify-between items-end mb-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {area.current.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">kWh</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    目标: {area.target.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={(area.current / area.target) * 100}
                  className="h-1.5"
                  indicatorClassName={area.color}
                />
                <div className="pt-4 grid grid-cols-2 gap-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Activity className="text-primary" size={14} />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      功率因素: 0.94
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sliders className="text-orange-500" size={14} />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      负载率: 72%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-border shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b border-border/50 px-6">
            <CardTitle className="text-base font-bold">今日分项能耗分布</CardTitle>
            <CardDescription className="text-xs">分系统电耗占比分析</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center bg-gray-50/50 rounded-lg mx-6 my-6">
            <div className="text-center text-gray-400">
              <PieChart className="mx-auto mb-2 opacity-30" size={48} />
              <p className="text-sm">饼图组件加载中...</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="details">
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="border-b border-border/50 px-6">
            <CardTitle className="text-base font-bold">详细数据</CardTitle>
            <CardDescription className="text-xs">各区域能耗明细与历史记录</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center rounded-lg mx-6 my-6">
            <p className="text-sm text-muted-foreground">详细数据内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stats">
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="border-b border-border/50 px-6">
            <CardTitle className="text-base font-bold">统计报表</CardTitle>
            <CardDescription className="text-xs">能耗趋势分析与报表导出</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center rounded-lg mx-6 my-6">
            <p className="text-sm text-muted-foreground">统计报表内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="config">
        <Card className="border border-border shadow-sm bg-card">
          <CardHeader className="border-b border-border/50 px-6">
            <CardTitle className="text-base font-bold">分项配置</CardTitle>
            <CardDescription className="text-xs">能耗分项模型与阈值设置</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center rounded-lg mx-6 my-6">
            <p className="text-sm text-muted-foreground">分项配置内容待补充</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
