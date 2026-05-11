import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Loader2,
  Workflow,
  List,
  GitGraph,
  History,
  Search,
  X,
} from "lucide-react";
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
import { Label } from "@ecoctrl/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Switch } from "@ecoctrl/ui/switch";
import { Badge } from "@ecoctrl/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ecoctrl/ui/tabs";

import { useAppStore } from "@/store/appStore";
import { useSubBreadcrumb } from "@/hooks/useSubBreadcrumb";
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
  const workflowTab = useAppStore((s) => s.workflowTab);
  const setWorkflowTab = useAppStore((s) => s.setWorkflowTab);
  const { setSubLabel } = useSubBreadcrumb();

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Dialog states
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowListItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    description: "",
    triggerType: "manual" as string,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [triggerLoadingId, setTriggerLoadingId] = useState<string | null>(null);

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
    setSubLabel("工作流管理");
    if (workflowTab === "list") {
      fetchWorkflows();
    }
  }, [fetchWorkflows, setSubLabel, workflowTab]);

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

  const handleTrigger = useCallback(async (id: string) => {
    setTriggerLoadingId(id);
    try {
      await workflowsApi.trigger(id);
    } catch {
      // silently fail
    } finally {
      setTriggerLoadingId(null);
    }
  }, []);

  const openCreate = useCallback(() => {
    setEditingWorkflow(null);
    setFormData({ slug: "", name: "", description: "", triggerType: "manual" });
    setIsEditOpen(true);
  }, []);

  const _openEdit = useCallback((workflow: WorkflowListItem) => {
    setEditingWorkflow(workflow);
    setFormData({
      slug: workflow.slug,
      name: workflow.name,
      description: workflow.description ?? "",
      triggerType: workflow.triggerType,
    });
    setIsEditOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    setFormLoading(true);
    try {
      if (editingWorkflow) {
        await workflowsApi.update(editingWorkflow.id, {
          slug: formData.slug,
          name: formData.name,
          description: formData.description || undefined,
        });
        setWorkflows((prev) =>
          prev.map((w) =>
            w.id === editingWorkflow.id
              ? {
                  ...w,
                  slug: formData.slug,
                  name: formData.name,
                  description: formData.description || null,
                }
              : w,
          ),
        );
      } else {
        const dsl = {
          version: "1.0" as const,
          trigger: { type: formData.triggerType as WorkflowListItem["triggerType"], config: {} },
          nodes: [
            { id: "start", type: "start" as const, name: "开始", config: {} },
            { id: "end", type: "end" as const, name: "结束", config: {} },
          ],
          edges: [{ id: "e-start-end", source: "start", target: "end" }],
        };
        await workflowsApi.create({
          slug: formData.slug,
          name: formData.name,
          description: formData.description || undefined,
          enabled: true,
          dsl,
        });
        await fetchWorkflows();
      }
      setIsEditOpen(false);
    } catch {
      // silently fail
    } finally {
      setFormLoading(false);
    }
  }, [editingWorkflow, formData, fetchWorkflows]);

  const columns = useMemo<ColumnDef<WorkflowListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "名称",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.slug}</span>
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
              onClick={() => setWorkflowTab("editor")}
              title="编辑"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleTrigger(row.original.id)}
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
              onClick={() => {
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
    [handleToggleEnabled, handleTrigger, triggerLoadingId, setWorkflowTab],
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
    <div className="flex h-full flex-col gap-4">
      <Tabs value={workflowTab} onValueChange={setWorkflowTab} className="flex h-full flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="list">
            <List size={14} className="mr-1.5" />
            列表
          </TabsTrigger>
          <TabsTrigger value="editor">
            <GitGraph size={14} className="mr-1.5" />
            编辑器
          </TabsTrigger>
          <TabsTrigger value="executions">
            <History size={14} className="mr-1.5" />
            执行记录
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 flex-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow size={18} />
                    工作流列表
                  </CardTitle>
                  <CardDescription>管理工作流定义与触发配置</CardDescription>
                </div>
                <Button onClick={openCreate}>
                  <Plus size={16} className="mr-1.5" />
                  新建工作流
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                        <TableRow key={row.id}>
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

              <div className="mt-4 flex items-center justify-between">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="mt-4 flex-1">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 py-20">
              <Workflow size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">画布编辑器将在阶段三实现</p>
              <Button variant="outline" onClick={() => setWorkflowTab("list")}>
                返回列表
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="mt-4 flex-1">
          <Card className="h-full">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 py-20">
              <History size={48} className="text-muted-foreground/30" />
              <p className="text-muted-foreground">执行记录将在阶段四实现</p>
              <Button variant="outline" onClick={() => setWorkflowTab("list")}>
                返回列表
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWorkflow ? "编辑工作流" : "新建工作流"}</DialogTitle>
            <DialogDescription>
              {editingWorkflow ? "修改工作流基本信息" : "创建一个新的工作流定义"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="slug">标识符</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="unique-workflow-id"
                disabled={!!editingWorkflow}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="工作流名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="可选描述"
              />
            </div>
            {!editingWorkflow && (
              <div className="grid gap-2">
                <Label htmlFor="triggerType">触发器类型</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(v) => setFormData((p) => ({ ...p, triggerType: v }))}
                >
                  <SelectTrigger id="triggerType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动触发</SelectItem>
                    <SelectItem value="state_change">状态变更</SelectItem>
                    <SelectItem value="schedule">定时调度</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="event">事件</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={formLoading || !formData.slug || !formData.name}>
              {formLoading && <Loader2 size={14} className="animate-spin mr-1.5" />}
              保存
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
