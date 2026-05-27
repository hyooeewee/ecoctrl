import { Plus, Pencil, Trash2, Play, Loader2, Workflow, History, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui/table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ecoctrl/ui/dialog";
import { Input } from "@ecoctrl/ui/input";
import { Switch } from "@ecoctrl/ui/switch";
import { Badge } from "@ecoctrl/ui/badge";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";

import { useAppStore } from "@/store/appStore";
import { useSseStore } from "@/store/sseStore";
import { useSseEvents } from "@/hooks/useSseEvents";
import type { SseWorkflowExecution } from "@/types/sse";
import { workflowsApi } from "@/api/workflows";
import type { WorkflowListItem } from "@/components/workflow-editor/types";
import { WorkflowCanvas } from "@/components/workflow-editor";
import ExecutionLogViewer from "@/components/ExecutionLogViewer";

const TRIGGER_LABELS: Record<string, string> = {
  state_change: "状态变更",
  schedule: "定时调度",
  manual: "手动触发",
  webhook: "Webhook",
  event: "事件",
};

const TRIGGER_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  state_change: "default",
  schedule: "secondary",
  manual: "outline",
  webhook: "destructive",
  event: "secondary",
};

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [triggerLoadingId, setTriggerLoadingId] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<SseWorkflowExecution[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  const activeTab = useAppStore((state) => state.workflowsTab);
  const setActiveTab = useAppStore((state) => state.setWorkflowsTab);
  const appActiveTab = useAppStore((state) => state.activeTab);
  const setAppActiveTab = useAppStore((state) => state.setActiveTab);
  const sseStatus = useSseStore((state) => state.status);

  const [canvasDirty, setCanvasDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    appTab: string;
    subTab: string;
  } | null>(null);

  const prevAppTabRef = useRef(appActiveTab);
  const prevSubTabRef = useRef(activeTab);

  // Close execution log when switching sub-tabs
  useEffect(() => {
    if (selectedExecutionId) {
      setSelectedExecutionId(null);
    }
  }, [activeTab]);

  // Intercept navigation while canvas has unsaved changes
  useEffect(() => {
    if (!editingWorkflowId) {
      prevAppTabRef.current = appActiveTab;
      prevSubTabRef.current = activeTab;
      return;
    }
    const appChanged = appActiveTab !== prevAppTabRef.current;
    const subChanged = activeTab !== prevSubTabRef.current;
    if (!appChanged && !subChanged) return;

    if (!canvasDirty) {
      // No changes — close canvas directly and allow navigation
      setEditingWorkflowId(null);
      prevAppTabRef.current = appActiveTab;
      prevSubTabRef.current = activeTab;
      return;
    }

    // Has changes — intercept and show confirmation dialog
    setPendingNavigation({ appTab: appActiveTab, subTab: activeTab });
    if (appChanged) setAppActiveTab(prevAppTabRef.current);
    if (subChanged) setActiveTab(prevSubTabRef.current);
    setShowLeaveDialog(true);
  }, [
    appActiveTab,
    activeTab,
    editingWorkflowId,
    canvasDirty,
    setEditingWorkflowId,
    setActiveTab,
    setAppActiveTab,
  ]);

  const [runningExecutions, setRunningExecutions] = useState<Record<string, SseWorkflowExecution>>(
    {},
  );
  const { onWorkflowExecution } = useSseEvents();

  // Load recent executions from database on mount
  useEffect(() => {
    workflowsApi
      .getRecentExecutions()
      .then((rows) => {
        setRecentExecutions(rows);
        const running: Record<string, SseWorkflowExecution> = {};
        for (const exec of rows) {
          if (exec.status === "running") running[exec.workflowId] = exec;
        }
        setRunningExecutions(running);
      })
      .catch(() => {
        // silently fail
      });
  }, []);

  useEffect(() => {
    const remove = onWorkflowExecution((exec) => {
      setRecentExecutions((prev) => {
        const idx = prev.findIndex((e) => e.executionId === exec.executionId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = exec;
          return next;
        }
        return [exec, ...prev].slice(0, 50);
      });
      if (exec.status === "running") {
        setRunningExecutions((prev) => ({ ...prev, [exec.workflowId]: exec }));
      } else if (exec.status === "completed" || exec.status === "failed") {
        setRunningExecutions((prev) => {
          const next = { ...prev };
          delete next[exec.workflowId];
          return next;
        });
      }
    });
    return remove;
  }, [onWorkflowExecution]);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workflowsApi.list(pageIndex + 1, pageSize);
      setWorkflows(res.items);
      setTotal(res.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize]);

  useEffect(() => {
    if (!editingWorkflowId) {
      fetchWorkflows();
    }
  }, [fetchWorkflows, editingWorkflowId]);

  const handleToggleEnabled = useCallback(async (id: string, enabled: boolean) => {
    try {
      await workflowsApi.update(id, { enabled });
      setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, enabled } : w)));
    } catch {
      // revert on error could be added
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await workflowsApi.delete(deletingId);
      setWorkflows((prev) => prev.filter((w) => w.id !== deletingId));
      setIsDeleteOpen(false);
      setDeletingId(null);
    } catch {
      // silently fail
    }
  }, [deletingId]);

  const handleTrigger = useCallback(async (e: React.MouseEvent, workflow: WorkflowListItem) => {
    e.stopPropagation();
    if (!workflow.hasPublishedVersion) {
      toast.error("请先发布工作流再执行");
      return;
    }
    setTriggerLoadingId(workflow.id);
    try {
      await workflowsApi.trigger(workflow.id);
    } catch {
      // silently fail
    } finally {
      setTriggerLoadingId(null);
    }
  }, []);

  const openCreate = useCallback(async () => {
    const slug = `wf-${Date.now()}`;
    const dsl = {
      version: "1.0" as const,
      trigger: { type: "manual" as const, config: {} },
      nodes: [
        { id: "start", type: "start" as const, name: "开始", config: {} },
        { id: "end", type: "end" as const, name: "结束", config: {} },
      ],
      edges: [{ id: "e-start-end", source: "start", target: "end" }],
    };
    try {
      const { id } = await workflowsApi.create({ slug, name: slug, enabled: true, dsl });
      setEditingWorkflowId(id);
    } catch {
      // silently fail
    }
  }, []);

  const openEditor = useCallback((id: string) => {
    setEditingWorkflowId(id);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingWorkflowId(null);
    fetchWorkflows();
  }, [fetchWorkflows]);

  const closeExecutionLog = useCallback(() => {
    setSelectedExecutionId(null);
  }, []);

  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveDialog(false);
    if (pendingNavigation) {
      setEditingWorkflowId(null);
      setCanvasDirty(false);
      if (pendingNavigation.appTab !== appActiveTab) {
        setAppActiveTab(pendingNavigation.appTab);
      }
      if (pendingNavigation.subTab !== activeTab) {
        setActiveTab(pendingNavigation.subTab);
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation, appActiveTab, activeTab]);

  const handleLeaveCancel = useCallback(() => {
    setShowLeaveDialog(false);
    setPendingNavigation(null);
  }, []);

  const columns = useMemo<ColumnDef<WorkflowListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <div className="group relative inline-block">
              <span className="font-medium">{row.original.name}</span>
              {row.original.description && (
                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 w-56 -translate-y-1/2 rounded-md border bg-popover p-2.5 shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs leading-relaxed text-popover-foreground">
                    {row.original.description}
                  </p>
                </div>
              )}
            </div>
            {row.original.tags && row.original.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.original.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="h-4 px-1 text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "triggerType",
        header: "触发器",
        cell: ({ row }) => (
          <Badge variant={TRIGGER_VARIANTS[row.original.triggerType] ?? "default"}>
            {TRIGGER_LABELS[row.original.triggerType] ?? row.original.triggerType}
          </Badge>
        ),
      },
      {
        accessorKey: "enabled",
        header: "状态",
        cell: ({ row }) => {
          const running = runningExecutions[row.original.id];
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={row.original.enabled}
                onCheckedChange={(v) => handleToggleEnabled(row.original.id, v)}
                size="sm"
              />
              {running && (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 text-[10px] text-amber-600 border-amber-300"
                >
                  <Loader2 size={10} className="animate-spin" />
                  运行中
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "version",
        header: "版本",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">v{row.original.version}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "更新时间",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.updatedAt).toLocaleString("zh-CN")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                openEditor(row.original.id);
              }}
              title="编辑"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => handleTrigger(e, row.original)}
              disabled={triggerLoadingId === row.original.id}
              title="手动触发"
            >
              {triggerLoadingId === row.original.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingId(row.original.id);
                setIsDeleteOpen(true);
              }}
              title="删除"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ),
      },
    ],
    [handleToggleEnabled, handleTrigger, triggerLoadingId, openEditor, runningExecutions],
  );

  const table = useReactTable({
    data: workflows,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsContent value="workflows" className="mt-0 flex h-full flex-col">
          {editingWorkflowId ? (
            <WorkflowCanvas
              workflowId={editingWorkflowId}
              onBack={closeEditor}
              onDirtyChange={setCanvasDirty}
            />
          ) : (
            <div className="h-full p-6">
              <Card className="flex h-full flex-col overflow-hidden">
                <CardHeader className="shrink-0 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Workflow size={18} />
                        工作流
                      </CardTitle>
                      <CardDescription>管理工作流定义与触发配置</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            sseStatus === "connected"
                              ? "bg-green-500"
                              : sseStatus === "connecting"
                                ? "bg-yellow-500 animate-pulse"
                                : sseStatus === "error"
                                  ? "bg-red-500"
                                  : "bg-gray-400"
                          }`}
                        />
                        <span className="text-muted-foreground text-xs">
                          {sseStatus === "connected"
                            ? "实时已连接"
                            : sseStatus === "connecting"
                              ? "连接中..."
                              : sseStatus === "error"
                                ? "连接错误"
                                : "未连接"}
                        </span>
                      </div>
                      <Button onClick={openCreate}>
                        <Plus size={16} className="mr-1.5" />
                        新建工作流
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search
                        size={14}
                        className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
                      />
                      <Input
                        placeholder="搜索名称或标识符..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-8"
                      />
                      {globalFilter && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                          onClick={() => setGlobalFilter("")}
                        >
                          <X size={12} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                          <TableRow key={hg.id}>
                            {hg.headers.map((h) => (
                              <TableHead key={h.id}>
                                {h.isPlaceholder
                                  ? null
                                  : flexRender(h.column.columnDef.header, h.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="h-32 text-center">
                              <Loader2 size={20} className="animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : table.getRowModel().rows.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className="h-32 text-center text-muted-foreground"
                            >
                              暂无工作流，点击右上角新建
                            </TableCell>
                          </TableRow>
                        ) : (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              className="cursor-pointer"
                              onClick={() => openEditor(row.original.id)}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
                <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">共 {total} 条</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      上一页
                    </Button>
                    <span className="text-muted-foreground text-sm">
                      第 {pageIndex + 1} / {Math.max(1, Math.ceil(total / pageSize))} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="executions" className="mt-0 flex h-full flex-col">
          {selectedExecutionId ? (
            <ExecutionLogViewer
              workflowId={
                recentExecutions.find((e) => e.executionId === selectedExecutionId)?.workflowId ??
                ""
              }
              executionId={selectedExecutionId}
              onBack={closeExecutionLog}
            />
          ) : (
            <Card className="flex h-full flex-col overflow-hidden">
              <CardHeader className="shrink-0 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <History size={18} />
                  执行记录
                </CardTitle>
                <CardDescription>最近 50 条工作流执行记录（实时更新）</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {recentExecutions.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4">
                    <History size={48} className="text-muted-foreground/30" />
                    <p className="text-muted-foreground">暂无执行记录</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>工作流 ID</TableHead>
                          <TableHead>执行 ID</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>耗时</TableHead>
                          <TableHead>时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentExecutions.map((exec) => (
                          <TableRow
                            key={exec.executionId}
                            className="cursor-pointer"
                            onClick={() => setSelectedExecutionId(exec.executionId)}
                          >
                            <TableCell className="font-mono text-xs">
                              {exec.workflowId.slice(0, 8)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {exec.executionId.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  exec.status === "completed"
                                    ? "default"
                                    : exec.status === "failed"
                                      ? "destructive"
                                      : exec.status === "running"
                                        ? "secondary"
                                        : "outline"
                                }
                                className={exec.status === "running" ? "animate-pulse" : ""}
                              >
                                {exec.status === "completed"
                                  ? "已完成"
                                  : exec.status === "failed"
                                    ? "失败"
                                    : exec.status === "running"
                                      ? "运行中"
                                      : "待定"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {exec.durationMs ? `${exec.durationMs}ms` : "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(exec.timestamp).toLocaleString("zh-CN")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Leave canvas without saving confirmation */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认离开</DialogTitle>
            <DialogDescription>有未保存的修改，离开后将丢失。是否继续？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleLeaveCancel}>
              留在当前页面
            </Button>
            <Button variant="destructive" onClick={handleLeaveConfirm}>
              离开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除后不可恢复，是否继续？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
