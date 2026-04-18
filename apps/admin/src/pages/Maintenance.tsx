import { BookOpen, Calendar, Clock, FileText, Trash2, Upload } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { REMINDERS } from "../constants/mockData";

interface Manual {
  id: string;
  name: string;
  url?: string;
}

export default function Maintenance() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [previewManual, setPreviewManual] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchManuals = async () => {
    try {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = (await res.json()) as Manual[];
      setManuals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuals();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
      }
      await fetchManuals();
    } catch (err) {
      console.error(err);
      alert("上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualClick = (manual: Manual) => {
    if (manual.url) {
      window.open(`${manual.url}/preview`, "_blank");
    } else {
      setPreviewManual(manual.name);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchManuals();
    } catch (err) {
      console.error(err);
      alert("删除失败，请重试");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">维保管理</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Manuals */}
        <Card className="flex h-full flex-col border-none shadow-sm lg:col-span-1 gap-0">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-gray-50 px-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-blue-600" />
              维保说明书
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={uploading}>
              <Upload size={15} />
              {uploading ? "上传中..." : "上传文件"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[500px]">
              <div className="px-2 py-1">
                {loading && (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                    加载中...
                  </div>
                )}
                {manuals.map((manual) => (
                  <div
                    key={manual.id}
                    className="group flex h-10 items-center justify-between overflow-hidden rounded-md px-6 hover:bg-blue-50"
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2 text-sm text-left hover:text-blue-700"
                      onClick={() => handleManualClick(manual)}
                      title={manual.name}
                    >
                      <FileText
                        size={16}
                        className="text-muted-foreground shrink-0 group-hover:text-blue-600"
                      />
                      <span className="block truncate">{manual.name}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(manual.id)}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
                {!loading && manuals.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">暂无维保说明书</p>
                    <p className="text-xs text-muted-foreground/60">点击右上角上传文件</p>
                  </div>
                )}
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
