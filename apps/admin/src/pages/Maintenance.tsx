import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecoctrl/ui";
import AppButton from "@/components/AppButton";

import { cn } from "@/lib/utils";
import { resolveAssetUrl } from "@/lib/url";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "@ecoctrl/shared";
import { filesApi } from "../api/files";
import { maintenanceApi } from "../api/maintenance";
import { fetchRaw } from "../api/request";

interface Manual {
  id: string;
  name: string;
  fileUrl?: string;
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MaintenanceCalendar({
  reminders,
  onDateSelect,
}: {
  reminders: MaintenanceReminder[];
  onDateSelect?: (dateStr: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: { day: number; dateStr: string }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      days.push(null as any);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ day: i, dateStr });
    }
    return days;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, MaintenanceReminder[]> = {};
    for (const r of reminders) {
      if (!map[r.dueDate]) map[r.dueDate] = [];
      map[r.dueDate].push(r);
    }
    return map;
  }, [reminders]);

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {year}年{month + 1}月
          </h3>
          <p className="text-xs text-muted-foreground">
            今天: {today.getFullYear()}年{today.getMonth() + 1}月{today.getDate()}日
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {weekDays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="h-9" />;
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day.day;
          const isSelected =
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === day.day;
          const events = eventsByDate[day.dateStr] || [];

          return (
            <button
              key={day.day}
              onClick={() => {
                const date = new Date(year, month, day.day);
                setSelectedDate(date);
                const ds = formatDateKey(date);
                onDateSelect?.(ds);
              }}
              className={cn(
                "relative flex h-9 flex-col items-center justify-center rounded-md text-sm transition-colors",
                isToday
                  ? "bg-blue-500 text-primary-foreground hover:bg-blue-600"
                  : isSelected
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "hover:bg-muted",
              )}
            >
              <span>{day.day}</span>
              {events.length > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {events.slice(0, 3).map((e, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        isToday
                          ? "bg-background/80"
                          : e.priority === "high"
                            ? "bg-red-500"
                            : e.priority === "medium"
                              ? "bg-orange-500"
                              : "bg-blue-500",
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Maintenance() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [previewManual, setPreviewManual] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<MaintenanceReminderDetail | null>(null);
  const todayStr = formatDateKey(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MaintenanceReminderDetail>>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchManuals = async () => {
    try {
      const data = await filesApi.list();
      setManuals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const data = await maintenanceApi.reminders.list();
      setReminders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchManuals();
    fetchReminders();
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
        await filesApi.upload(file);
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

  const handleManualClick = async (manual: Manual) => {
    if (manual.fileUrl) {
      try {
        const res = await fetchRaw(`/files/${manual.id}/preview`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } catch {
        alert("文件预览失败");
      }
    } else {
      setPreviewManual(manual.name);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await filesApi.delete(id);
      await fetchManuals();
    } catch (err) {
      console.error(err);
      alert("删除失败，请重试");
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const data = await maintenanceApi.reminders.detail(id);
      setSelectedReminder(data);
      setIsEditing(false);
      setEditForm({});
    } catch (err) {
      console.error(err);
      alert("获取详情失败，请重试");
    }
  };

  const startEdit = () => {
    if (!selectedReminder) return;
    setEditForm({ ...selectedReminder });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedReminder || !editForm) return;
    setSaving(true);
    try {
      const updated = await maintenanceApi.reminders.update(selectedReminder.id, editForm);
      setSelectedReminder(updated);
      setIsEditing(false);
      await fetchReminders();
    } catch (err) {
      console.error(err);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const selectedDateReminders = reminders.filter((r) => r.dueDate === selectedDateStr);

  const handleDateSelect = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Manuals */}
        <Card className="flex h-full flex-col border-none shadow-sm lg:col-span-1 gap-0">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 px-6 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-blue-600" />
              维保说明书
            </CardTitle>
            <AppButton level="action" size="sm" onClick={handleUploadClick} disabled={uploading}>
              <Upload size={15} />
              {uploading ? "上传中..." : "上传文件"}
            </AppButton>
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
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
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
                    <AppButton
                      level="danger"
                      size="icon-sm"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(manual.id)}
                    >
                      <Trash2 size={14} />
                    </AppButton>
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

        {/* Right Side: Calendar View and Reminders */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="border-none shadow-sm p-6">
            <MaintenanceCalendar reminders={reminders} onDateSelect={handleDateSelect} />
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-6 pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock size={18} className="text-orange-500" />
                  {selectedDateStr === todayStr ? "今日维保提醒" : `${selectedDateStr} 维保提醒`}
                </CardTitle>
                <CardDescription>
                  {selectedDateStr === todayStr
                    ? "今天需要关注的设备保养任务清单"
                    : `${selectedDateStr}需要关注的设备保养任务清单`}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowAllPlans(true)}>
                全部计划
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              {selectedDateReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="group flex cursor-pointer items-center justify-between rounded-lg bg-muted p-4 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-2 rounded-full ${reminder.priority === "high" ? "bg-red-500" : reminder.priority === "medium" ? "bg-orange-500" : "bg-blue-500"}`}
                    ></div>
                    <div>
                      <p className="font-semibold text-foreground">{reminder.task}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        截止日期: {reminder.dueDate}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => handleViewDetail(reminder.id)}
                  >
                    查看详情
                  </Button>
                </div>
              ))}
              {selectedDateReminders.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {selectedDateStr === todayStr ? "今日暂无维保任务" : "该日期暂无维保任务"}
                </div>
              )}
            </CardContent>
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
          <div className="flex-1 bg-muted p-4">
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background shadow-inner">
              <div className="absolute top-0 left-0 h-1.5 w-full animate-pulse bg-blue-500 opacity-50"></div>
              <FileText size={64} className="mb-4 text-muted-foreground/30" />
              <div className="space-y-2 text-center">
                <p className="text-lg font-semibold text-foreground">正在加载文档内容...</p>
                <p className="text-sm text-muted-foreground">正在从安全服务器检索 PDF 流</p>
              </div>
              {/* PDF Viewer Placeholder */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAllPlans} onOpenChange={(open) => !open && setShowAllPlans(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="text-orange-500" size={18} />
              全部维保计划
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {reminders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无维保计划</div>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between rounded-lg bg-muted px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-10 w-2 rounded-full",
                          reminder.priority === "high"
                            ? "bg-red-500"
                            : reminder.priority === "medium"
                              ? "bg-orange-500"
                              : "bg-blue-500",
                        )}
                      />
                      <div>
                        <p className="font-semibold text-foreground">{reminder.task}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          截止日期: {reminder.dueDate}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        reminder.priority === "high"
                          ? "bg-red-50 text-red-600"
                          : reminder.priority === "medium"
                            ? "bg-orange-50 text-orange-600"
                            : "bg-blue-50 text-blue-600",
                      )}
                    >
                      {reminder.priority === "high"
                        ? "高优先级"
                        : reminder.priority === "medium"
                          ? "中优先级"
                          : "低优先级"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedReminder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReminder(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="text-orange-500" size={18} />
              {isEditing ? "编辑维保任务" : "维保任务详情"}
            </DialogTitle>
          </DialogHeader>
          {selectedReminder && !isEditing && (
            <div className="space-y-4 py-2">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  编辑
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">任务名称</p>
                  <p className="text-sm font-medium">{selectedReminder.task}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    selectedReminder.priority === "high"
                      ? "bg-red-50 text-red-600"
                      : selectedReminder.priority === "medium"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-blue-50 text-blue-600",
                  )}
                >
                  {selectedReminder.priority === "high"
                    ? "高优先级"
                    : selectedReminder.priority === "medium"
                      ? "中优先级"
                      : "低优先级"}
                </span>
              </div>
              {selectedReminder.description && (
                <div>
                  <p className="text-xs text-muted-foreground">任务描述</p>
                  <p className="text-sm text-foreground">{selectedReminder.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">截止日期</p>
                  <p className="text-sm font-medium">{selectedReminder.dueDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">状态</p>
                  <p className="text-sm font-medium">
                    {selectedReminder.status === "pending"
                      ? "待处理"
                      : selectedReminder.status === "in_progress"
                        ? "进行中"
                        : selectedReminder.status === "completed"
                          ? "已完成"
                          : selectedReminder.status || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">负责人</p>
                  <p className="text-sm font-medium">{selectedReminder.assignee || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">地点</p>
                  <p className="text-sm font-medium">{selectedReminder.location || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">预估工时</p>
                  <p className="text-sm font-medium">
                    {selectedReminder.estimatedHours
                      ? `${selectedReminder.estimatedHours} 小时`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">上次完成</p>
                  <p className="text-sm font-medium">{selectedReminder.lastCompleted || "-"}</p>
                </div>
              </div>
            </div>
          )}
          {selectedReminder && isEditing && (
            <div className="space-y-3 py-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-sm font-semibold">任务名称</Label>
                  <span
                    className={cn(
                      "text-xs",
                      (editForm.task?.length || 0) < 2 || (editForm.task?.length || 0) > 100
                        ? "text-red-500"
                        : "text-muted-foreground",
                    )}
                  >
                    {editForm.task?.length || 0} / 100
                  </span>
                </div>
                <Input
                  maxLength={100}
                  value={editForm.task || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, task: e.target.value }))}
                />
                {(editForm.task?.length || 0) < 2 && (
                  <p className="mt-1 text-xs text-red-500">任务名称至少需要 2 个字符</p>
                )}
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-sm font-semibold">任务描述</Label>
                  <span
                    className={cn(
                      "text-xs",
                      (editForm.description?.length || 0) > 2000
                        ? "text-red-500"
                        : "text-muted-foreground",
                    )}
                  >
                    {editForm.description?.length || 0} / 2000
                  </span>
                </div>
                <textarea
                  maxLength={2000}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">截止日期</Label>
                  <Input
                    type="date"
                    value={editForm.dueDate || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">优先级</Label>
                  <Select
                    value={editForm.priority || ""}
                    onValueChange={(v) =>
                      setEditForm((f) => ({
                        ...f,
                        priority: v as MaintenanceReminder["priority"],
                      }))
                    }
                    items={{ high: "高", medium: "中", low: "低" }}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="选择优先级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="low">低</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">状态</Label>
                  <Select
                    value={editForm.status || ""}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                    items={{ pending: "待处理", in_progress: "进行中", completed: "已完成" }}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">待处理</SelectItem>
                      <SelectItem value="in_progress">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">负责人</Label>
                  <Input
                    value={editForm.assignee || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, assignee: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">地点</Label>
                  <Input
                    value={editForm.location || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">预估工时</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editForm.estimatedHours ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, estimatedHours: parseFloat(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  取消
                </Button>
                <AppButton
                  level="action"
                  size="sm"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !editForm.task ||
                    editForm.task.length < 2 ||
                    editForm.task.length > 100 ||
                    (editForm.description?.length || 0) > 2000
                  }
                >
                  {saving ? "保存中..." : "保存"}
                </AppButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
