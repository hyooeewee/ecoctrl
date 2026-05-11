import { Activity, PieChart, Sliders, ExternalLink, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@ecoctrl/ui";
import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@ecoctrl/ui";

import { useSubBreadcrumb } from "@/hooks/useSubBreadcrumb";
import { useAppStore } from "@/store/appStore";
import { Progress } from "../components/Progress";
import type { EnergyArea, CarbonFactor } from "@ecoctrl/shared";
import { energyApi } from "../api/energy";

export default function Energy() {
  const [areas, setAreas] = useState<EnergyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const activeTab = useAppStore((state) => state.energyTab);
  const setActiveTab = useAppStore((state) => state.setEnergyTab);
  const { setSubLabel } = useSubBreadcrumb();

  const [carbonFactors, setCarbonFactors] = useState<CarbonFactor[]>([]);
  const [carbonLoading, setCarbonLoading] = useState(false);
  const [carbonRefreshing, setCarbonRefreshing] = useState(false);
  const [carbonError, setCarbonError] = useState(false);

  useEffect(() => {
    const labels: Record<string, string> = {
      overview: "分区总览",
      details: "详细数据",
      stats: "统计报表",
      config: "碳排放因子",
    };
    setSubLabel(labels[activeTab] ?? null);
  }, [activeTab, setSubLabel]);

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

  const fetchCarbonFactors = async () => {
    setCarbonLoading(true);
    setCarbonError(false);
    try {
      const data = await energyApi.carbonFactors();
      setCarbonFactors(data);
    } catch (err) {
      console.error(err);
      setCarbonError(true);
    } finally {
      setCarbonLoading(false);
    }
  };

  const handleRefreshCarbonFactors = async () => {
    setCarbonRefreshing(true);
    try {
      const result = await energyApi.refreshCarbonFactors();
      alert(`已刷新 ${result.count} 条碳排放因子数据`);
      await fetchCarbonFactors();
    } catch (err) {
      const message = err instanceof Error ? err.message : "刷新失败";
      alert(`刷新失败：${message}`);
    } finally {
      setCarbonRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === "config") {
      fetchCarbonFactors();
    }
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
      <TabsList>
        <TabsTrigger value="overview">分区总览</TabsTrigger>
        <TabsTrigger value="details">详细数据</TabsTrigger>
        <TabsTrigger value="stats">统计报表</TabsTrigger>
        <TabsTrigger value="config">碳排放因子</TabsTrigger>
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
            {areas.map((area) => (
              <Card
                key={area.id}
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

      <TabsContent value="config" className="space-y-6">
        <Card className="border-border bg-card border shadow-sm">
          <CardHeader className="border-border/50 flex flex-row items-center justify-between border-b px-6">
            <div>
              <CardTitle className="text-base font-bold">碳排放因子</CardTitle>
              <CardDescription className="text-xs">
                数据来源：国家温室气体排放因子库
                {carbonFactors.length > 0 && carbonFactors[0]?.updatedAt && (
                  <span className="ml-2 text-muted-foreground">
                    （最后更新：{new Date(carbonFactors[0].updatedAt).toLocaleString()}）
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefreshCarbonFactors}
              disabled={carbonRefreshing}
            >
              <RefreshCw size={14} className={carbonRefreshing ? "animate-spin" : ""} />
              {carbonRefreshing ? "刷新中..." : "刷新数据"}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {carbonLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                加载中...
              </div>
            ) : carbonError ? (
              <div className="flex h-64 items-center justify-center text-sm text-red-400">
                数据加载失败，请稍后重试
              </div>
            ) : carbonFactors.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                暂无碳排放因子数据，请点击右上角刷新获取
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="px-6">过程名称</TableHead>
                    <TableHead>单位类别</TableHead>
                    <TableHead>ISIC分类</TableHead>
                    <TableHead className="text-right">因子值</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>地理位置</TableHead>
                    <TableHead className="px-6">来源</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carbonFactors.map((factor) => (
                    <TableRow key={factor.id}>
                      <TableCell className="px-6 font-medium">{factor.name}</TableCell>
                      <TableCell>{factor.unitGroup ?? "-"}</TableCell>
                      <TableCell>{factor.category ?? "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {factor.value?.toLocaleString() ?? "-"}
                      </TableCell>
                      <TableCell>{factor.unit ?? "-"}</TableCell>
                      <TableCell>{factor.location ?? "-"}</TableCell>
                      <TableCell className="px-6 text-muted-foreground text-xs">
                        {factor.source ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
