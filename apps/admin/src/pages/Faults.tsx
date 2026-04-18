import { AlertCircle, History, BarChart3, Clock } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FAULTS } from "../constants/mockData";

export default function Faults() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-l-4 border-none border-l-red-500 bg-red-50 shadow-sm">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600">本月总故障数</p>
              <h3 className="text-3xl font-bold text-red-900">24</h3>
              <p className="mt-2 text-xs font-medium text-red-700/60">比上月减少 12%</p>
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
              <h3 className="text-3xl font-bold text-blue-900">4.2h</h3>
              <p className="mt-2 text-xs font-medium text-blue-700/60">系统平均响应时间: 15min</p>
            </div>
            <div className="rounded-full bg-blue-100 p-4 text-blue-600">
              <Clock size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="bg-gray-100/80 p-1">
          <TabsTrigger
            value="list"
            className="gap-2 px-6 data-selected:bg-white data-selected:shadow-sm"
          >
            <History size={16} />
            实时故障列表
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="gap-2 px-6 text-gray-500 data-selected:bg-white data-selected:shadow-sm"
          >
            <BarChart3 size={16} />
            故障统计分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6">设备名称</TableHead>
                    <TableHead className="text-center">故障等级</TableHead>
                    <TableHead className="text-center">发生时间</TableHead>
                    <TableHead className="px-6 text-right">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FAULTS.map((fault) => (
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
                      <TableCell className="text-center font-mono text-sm text-gray-500">
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-none border-gray-200 bg-gray-50 shadow-sm">
            <div className="text-center text-gray-400">
              <BarChart3 className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">统计分析图表加载中...</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
