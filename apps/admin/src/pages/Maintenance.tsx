import { BookOpen, Calendar, Clock, FileText, ExternalLink } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { REMINDERS } from "../constants/mockData";

export default function Maintenance() {
  const [previewManual, setPreviewManual] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">维保管理</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Manuals */}
        <Card className="flex h-full flex-col border-none shadow-sm lg:col-span-1">
          <CardHeader className="border-b border-gray-50 px-6">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-blue-600" />
              维保说明书
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1 p-2">
                {[
                  "空调系统 A1 系列说明",
                  "ABB 高压柜操作手册",
                  "电梯维保技术标准 (2024)",
                  "消防联动系统测试指南",
                  "各层给排水分布图",
                  "弱电智能化系统架构",
                ].map((item, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="group h-10 w-full justify-between px-3 text-sm font-normal hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setPreviewManual(item)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText
                        size={16}
                        className="text-muted-foreground shrink-0 group-hover:text-blue-600"
                      />
                      <span className="truncate">{item}</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-300" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Side: Reminders and Calendar View */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-6 pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock size={18} className="text-orange-500" />
                  今日维保提醒
                </CardTitle>
                <CardDescription>今天需要关注的设备保养任务清单</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                全部计划
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {REMINDERS.map((reminder) => (
                <div
                  key={reminder.id}
                  className="group flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-2 rounded-full ${reminder.priority === "high" ? "bg-red-500" : reminder.priority === "medium" ? "bg-orange-500" : "bg-blue-500"}`}
                    ></div>
                    <div>
                      <p className="font-semibold text-gray-900">{reminder.task}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        截止日期: {reminder.dueDate}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    查看详情
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="flex min-h-[400px] items-center justify-center border-none bg-gray-50 shadow-sm">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">日历视图占位符</h3>
              <p className="mt-1 text-sm text-gray-500">此区域将集成全功能维保排程日历。</p>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={!!previewManual} onOpenChange={(open) => !open && setPreviewManual(null)}>
        <DialogContent className="flex h-[80vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-blue-600" size={18} />
              维保说明书预览: {previewManual}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 p-4">
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-inner">
              <div className="absolute top-0 left-0 h-1.5 w-full animate-pulse bg-blue-500 opacity-50"></div>
              <FileText size={64} className="mb-4 text-gray-200" />
              <div className="space-y-2 text-center">
                <p className="text-lg font-semibold text-gray-700">正在加载文档内容...</p>
                <p className="text-sm text-gray-400">正在从安全服务器检索 PDF 流</p>
              </div>
              {/* PDF Viewer Placeholder */}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
