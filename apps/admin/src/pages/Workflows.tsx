import { Plus, Pencil, Trash2, Play, Loader2, Workflow, History, Search, X } from "lucide-react";
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
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
import { workflowsApi } from "@/api/workflows";
import type { WorkflowListItem } from "@/components/workflow-editor/types";
import { WorkflowCanvas } from "@/components/workflow-editor";

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

  const activeTab = useAppStore((state) => state.workflowsTab);
  const setActiveTab = useAppStore((state) => state.setWorkflowsTab);

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

  const handleTrigger = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTriggerLoadingId(id);
    try {
      await workflowsApi.trigger(id);
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
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={(v) => handleToggleEnabled(row.original.id, v)}
            size="sm"
          />
        ),
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
              onClick={(e) => handleTrigger(e, row.original.id)}
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
    [handleToggleEnabled, handleTrigger, triggerLoadingId, openEditor],
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

  // Full-screen editor overlay
  if (editingWorkflowId) {
    return <WorkflowCanvas workflowId={editingWorkflowId} onBack={closeEditor} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
        <TabsContent value="workflows" className="mt-0 flex h-full flex-col">
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
                <Button onClick={openCreate}>
                  <Plus size={16} className="mr-1.5" />
                  新建工作流
                </Button>
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
        </TabsContent>

        <TabsContent value="executions" className="mt-0 flex h-full flex-col">
          <Card className="flex h-full flex-col overflow-hidden">
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
              <History size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">执行记录功能开发中</p>
            </CardContent>
          </Card>
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
    </div>
  );
}
