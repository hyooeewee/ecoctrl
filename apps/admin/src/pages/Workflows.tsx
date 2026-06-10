import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Loader2,
  Workflow,
  History,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { type ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ecoctrl/ui/dialog";
import { Switch } from "@ecoctrl/ui/switch";
import { Badge } from "@ecoctrl/ui/badge";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";

import { DataTablePanel } from "@/components/DataTablePanel";
import { useAppStore } from "@/store/appStore";
import { useSseStore } from "@/store/sseStore";
import { useSseEvents } from "@/hooks/useSseEvents";
import type { SseWorkflowExecution } from "@/types/sse";
import { workflowsApi } from "@/api/workflows";
import type { WorkflowListItem } from "@/components/workflow-editor/types";

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
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [triggerLoadingId, setTriggerLoadingId] = useState<string | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<SseWorkflowExecution[]>([]);

  // Execution deletion state
  const [selectedExecutionIds, setSelectedExecutionIds] = useState<string[]>([]);
  const [isExecutionDeleteOpen, setIsExecutionDeleteOpen] = useState(false);
  const [deletingExecutionIds, setDeletingExecutionIds] = useState<string[]>([]);
  const [executionDeleteLoading, setExecutionDeleteLoading] = useState(false);

  const activeTab = useAppStore((state) => state.workflowsTab);
  const setActiveTab = useAppStore((state) => state.setWorkflowsTab);
  const setAppActiveTab = useAppStore((state) => state.setActiveTab);
  const setCanvasWorkflowId = useAppStore((state) => state.setCanvasWorkflowId);
  const setLogViewerData = useAppStore((state) => state.setLogViewerData);
  const sseStatus = useSseStore((state) => state.status);

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
    fetchWorkflows();
  }, [fetchWorkflows]);

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

  const handleExport = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const data = await workflowsApi.export(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.slug}.dsl`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败");
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        try {
          const parsed = JSON.parse(content);
          if (!parsed.dsl || !parsed.slug || !parsed.name) {
            toast.error("无效的 DSL 文件");
            return;
          }

          const uniqueSlug = `${parsed.slug}-${Date.now()}`;
          const body = {
            slug: uniqueSlug,
            name: parsed.name,
            description: parsed.description,
            enabled: false,
            dsl: parsed.dsl,
          };

          const { id } = await workflowsApi.create(body);
          toast.success("导入成功");
          fetchWorkflows();
          setCanvasWorkflowId(id);
          setAppActiveTab("workflowCanvas");
        } catch {
          toast.error("导入失败：文件解析错误");
        }

        e.target.value = "";
      };
      reader.readAsText(file);
    },
    [fetchWorkflows, setCanvasWorkflowId, setAppActiveTab],
  );

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
      setCanvasWorkflowId(id);
      setAppActiveTab("workflowCanvas");
    } catch {
      // silently fail
    }
  }, [setCanvasWorkflowId, setAppActiveTab]);

  const openEditor = useCallback(
    (id: string) => {
      setCanvasWorkflowId(id);
      setAppActiveTab("workflowCanvas");
    },
    [setCanvasWorkflowId, setAppActiveTab],
  );

  const openExecutionLog = useCallback(
    (row: SseWorkflowExecution) => {
      setLogViewerData({
        type: "execution",
        workflowId: row.workflowId,
        executionId: row.executionId,
      });
      setAppActiveTab("logViewer");
    },
    [setLogViewerData, setAppActiveTab],
  );

  const confirmDeleteExecutions = useCallback(async () => {
    if (deletingExecutionIds.length === 0) return;
    setExecutionDeleteLoading(true);
    try {
      if (deletingExecutionIds.length === 1) {
        const exec = recentExecutions.find((e) => e.executionId === deletingExecutionIds[0]);
        if (exec) {
          await workflowsApi.deleteExecution(exec.workflowId, deletingExecutionIds[0]);
        }
      } else {
        await workflowsApi.deleteExecutions(deletingExecutionIds);
      }
      setRecentExecutions((prev) =>
        prev.filter((e) => !deletingExecutionIds.includes(e.executionId)),
      );
      setSelectedExecutionIds((prev) => prev.filter((id) => !deletingExecutionIds.includes(id)));
      setIsExecutionDeleteOpen(false);
    } catch {
      // silently fail
    } finally {
      setExecutionDeleteLoading(false);
      setDeletingExecutionIds([]);
    }
  }, [deletingExecutionIds, recentExecutions]);

  const workflowColumns = useMemo<ColumnDef<WorkflowListItem>[]>(
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
              onClick={(e) => handleExport(e, row.original.id)}
              title="导出"
            >
              <Download size={14} />
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
    [
      handleToggleEnabled,
      handleTrigger,
      triggerLoadingId,
      openEditor,
      runningExecutions,
      handleExport,
    ],
  );

  const executionColumns = useMemo<ColumnDef<SseWorkflowExecution>[]>(
    () => [
      {
        accessorKey: "workflowId",
        header: "工作流 ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.workflowId.slice(0, 8)}</span>
        ),
      },
      {
        accessorKey: "executionId",
        header: "执行 ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.executionId.slice(0, 8)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "completed"
                ? "default"
                : row.original.status === "failed"
                  ? "destructive"
                  : row.original.status === "running"
                    ? "secondary"
                    : "outline"
            }
            className={row.original.status === "running" ? "animate-pulse" : ""}
          >
            {row.original.status === "completed"
              ? "已完成"
              : row.original.status === "failed"
                ? "失败"
                : row.original.status === "running"
                  ? "运行中"
                  : "待定"}
          </Badge>
        ),
      },
      {
        accessorKey: "durationMs",
        header: "耗时",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.durationMs ? `${row.original.durationMs}ms` : "-"}
          </span>
        ),
      },
      {
        accessorKey: "timestamp",
        header: "时间",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.timestamp).toLocaleString("zh-CN")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingExecutionIds([row.original.executionId]);
              setIsExecutionDeleteOpen(true);
            }}
            title="删除"
          >
            <Trash2 size={14} />
          </Button>
        ),
      },
    ],
    [],
  );

  const sseStatusIndicator = useMemo(
    () => (
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
    ),
    [sseStatus],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsContent value="workflows" className="mt-0 flex h-full flex-col overflow-hidden">
          <div className="h-full p-6">
            <DataTablePanel
              title="工作流"
              description="管理工作流定义与触发配置"
              action={
                <div className="flex items-center gap-3">
                  {sseStatusIndicator}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".dsl"
                    className="hidden"
                    onChange={handleImport}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={16} className="mr-1.5" />
                    导入
                  </Button>
                  <Button onClick={openCreate}>
                    <Plus size={16} className="mr-1.5" />
                    新建工作流
                  </Button>
                </div>
              }
              loading={loading}
              emptyIcon={<Workflow className="h-12 w-12 text-muted-foreground/40" />}
              emptyTitle="暂无工作流"
              emptyDescription="点击右上角「新建工作流」按钮创建。"
              data={workflows}
              columns={workflowColumns}
              getRowId={(row) => row.id}
              onRowClick={(row) => openEditor(row.id)}
              manualPagination
              pageCount={Math.max(1, Math.ceil(total / pageSize))}
              rowCount={total}
              pagination={{ pageIndex, pageSize }}
              onPaginationChange={({ pageIndex: idx, pageSize: size }) => {
                setPageIndex(idx);
                setPageSize(size);
              }}
              pageSizeOptions={[10, 20, 50]}
              onPageSizeChange={setPageSize}
            />
          </div>
        </TabsContent>

        <TabsContent value="executions" className="mt-0 flex h-full flex-col overflow-hidden">
          <div className="h-full p-6">
            <DataTablePanel
              title="执行记录"
              description="最近 50 条工作流执行记录（实时更新）"
              emptyIcon={<History className="h-12 w-12 text-muted-foreground/40" />}
              emptyTitle="暂无执行记录"
              emptyDescription="执行工作流后将在此显示记录。"
              data={recentExecutions}
              columns={executionColumns}
              getRowId={(row) => row.executionId}
              onRowClick={(row) => openExecutionLog(row)}
              enableRowSelection
              selectedRowIds={selectedExecutionIds}
              onSelectionChange={setSelectedExecutionIds}
              batchActions={
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setDeletingExecutionIds(selectedExecutionIds);
                    setIsExecutionDeleteOpen(true);
                  }}
                  disabled={selectedExecutionIds.length === 0}
                >
                  <Trash2 size={14} className="mr-1.5" />
                  批量删除 ({selectedExecutionIds.length})
                </Button>
              }
              pageSizeOptions={[10, 25, 50]}
            />
          </div>
        </TabsContent>
      </Tabs>

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

      {/* Execution Delete Confirm Dialog */}
      <Dialog open={isExecutionDeleteOpen} onOpenChange={setIsExecutionDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {deletingExecutionIds.length > 1
                ? `确定要删除选中的 ${deletingExecutionIds.length} 条执行记录吗？删除后不可恢复。`
                : "删除后不可恢复，是否继续？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsExecutionDeleteOpen(false);
                setDeletingExecutionIds([]);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteExecutions}
              disabled={executionDeleteLoading}
            >
              {executionDeleteLoading ? <Loader2 size={14} className="animate-spin" /> : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
