import React from "react";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, History, BarChart3, Clock } from "lucide-react";
import { FAULTS } from "../constants/mockData";

export default function Faults() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">故障管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-red-50 border-l-4 border-l-red-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600">本月总故障数</p>
              <h3 className="text-3xl font-bold text-red-900">24</h3>
              <p className="text-xs text-red-700/60 mt-2 font-medium">比上月减少 12%</p>
            </div>
            <div className="p-4 bg-red-100 rounded-full text-red-600">
              <AlertCircle size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-blue-50 border-l-4 border-l-blue-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-600">平均修复时间 (MTTR)</p>
              <h3 className="text-3xl font-bold text-blue-900">4.2h</h3>
              <p className="text-xs text-blue-700/60 mt-2 font-medium">系统平均响应时间: 15min</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-full text-blue-600">
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
            className="gap-2 px-6 data-selected:bg-white data-selected:shadow-sm text-gray-500"
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
                    <TableHead>故障等级</TableHead>
                    <TableHead>发生时间</TableHead>
                    <TableHead className="text-right pr-6">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FAULTS.map((fault) => (
                    <TableRow key={fault.id}>
                      <TableCell className="font-semibold px-6">{fault.device}</TableCell>
                      <TableCell>
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
                      <TableCell className="text-gray-500 font-mono text-sm">
                        {fault.time}
                      </TableCell>
                      <TableCell className="text-right">
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
          <Card className="border-none shadow-sm h-64 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
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
