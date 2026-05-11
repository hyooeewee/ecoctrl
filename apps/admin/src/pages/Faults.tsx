import { AlertCircle, History, BarChart3, Clock } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Badge } from "@ecoctrl/ui";
import { Card, CardContent } from "@ecoctrl/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui";

import { useAppStore } from "@/store/appStore";
import type { Fault, FaultStats } from "@ecoctrl/shared";
import { faultsApi } from "../api/faults";

export default function Faults() {
  const [faults, setFaults] = useState<Fault[]>([]);
  const [stats, setStats] = useState<FaultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const activeTab = useAppStore((state) => state.faultsTab);
  const setActiveTab = useAppStore((state) => state.setFaultsTab);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [listData, statsData] = await Promise.all([faultsApi.list(), faultsApi.stats()]);
        setFaults(listData);
        setStats(statsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-l-4 border-none border-l-red-500 bg-red-50 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600">本月总故障数</p>
              <h3 className="text-3xl font-bold text-red-900">{stats?.totalCount ?? "-"}</h3>
              {stats && (
                <p className="mt-2 text-xs font-medium text-red-700/60">
                  比上月{stats.trend.startsWith("-") ? "减少" : "增加"}{" "}
                  {stats.trend.replace(/[+-]/, "")}
                </p>
              )}
            </div>
            <div className="rounded-full bg-red-100 p-4 text-red-600">
              <AlertCircle size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-none border-l-blue-500 bg-blue-50 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-600">平均修复时间 (MTTR)</p>
              <h3 className="text-3xl font-bold text-blue-900">{stats?.mttr ?? "-"}h</h3>
              {stats && (
                <p className="mt-2 text-xs font-medium text-blue-700/60">
                  系统平均响应时间: {stats.avgResponseTime}
                </p>
              )}
            </div>
            <div className="rounded-full bg-blue-100 p-4 text-blue-600">
              <Clock size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="list" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-6">设备名称</TableHead>
                      <TableHead className="text-center">故障等级</TableHead>
                      <TableHead className="text-center">发生时间</TableHead>
                      <TableHead className="px-6 text-right">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faults.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-sm text-muted-foreground"
                        >
                          暂无故障数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      faults.map((fault) => (
                        <TableRow key={fault.id}>
                          <TableCell className="px-6 font-semibold">{fault.device}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={
                                fault.level === "严重"
                                  ? "bg-red-50 text-red-600"
                                  : fault.level === "一般"
                                    ? "bg-orange-50 text-orange-600"
                                    : "bg-blue-50 text-blue-600"
                              }
                              variant="outline"
                            >
                              {fault.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm text-muted-foreground">
                            {fault.time}
                          </TableCell>
                          <TableCell className="px-6 text-right">
                            <span
                              className={`text-sm font-medium ${fault.status === "待处理" ? "text-red-500" : fault.status === "维保中" ? "text-orange-500" : "text-green-500"}`}
                            >
                              {fault.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-none border-border bg-muted shadow-sm">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">统计分析图表加载中...</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
