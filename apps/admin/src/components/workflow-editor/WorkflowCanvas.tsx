import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Save,
  Play,
  Square,
  Globe,
  Database,
  Mail,
  Variable,
  Clock,
  GitBranch,
  GitFork,
  Repeat,
  Layers,
  Trash2,
  Search,
  X,
  Zap,
  ChevronRight,
  ChevronDown,
  LayoutTemplate,
  Settings,
  MoreHorizontal,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Label } from "@ecoctrl/ui/label";
import { Badge } from "@ecoctrl/ui/badge";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";
import { Separator } from "@ecoctrl/ui/separator";
import { ScrollArea } from "@ecoctrl/ui/scroll-area";
import { Textarea } from "@ecoctrl/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ecoctrl/ui/dialog";

import { workflowsApi } from "@/api/workflows";
import type { WorkflowDSL, NodeType, WorkflowListItem } from "./types";
import { dslToReactFlow, reactFlowToDSL } from "./transform";
import { autoLayout } from "./layout";
import StartNode from "./nodes/StartNode";
import EndNode from "./nodes/EndNode";
import ActionNode from "./nodes/ActionNode";
import ConditionNode from "./nodes/ConditionNode";
import LoopNode from "./nodes/LoopNode";
import ParallelNode from "./nodes/ParallelNode";

const NODE_TYPES = {
  start: StartNode,
  end: EndNode,
  http_request: ActionNode,
  database: ActionNode,
  email: ActionNode,
  variable: ActionNode,
  delay: ActionNode,
  condition: ConditionNode,
  switch: ConditionNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

interface ComponentItem {
  type: NodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
}

interface ComponentCategory {
  id: string;
  label: string;
  items: ComponentItem[];
}

const COMPONENT_CATEGORIES: ComponentCategory[] = [
  {
    id: "trigger",
    label: "触发器",
    items: [
      {
        type: "start",
        label: "开始",
        description: "流程入口节点",
        icon: Play,
        colorClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
      },
    ],
  },
  {
    id: "actions",
    label: "动作",
    items: [
      {
        type: "http_request",
        label: "HTTP 请求",
        description: "发送 HTTP 请求",
        icon: Globe,
        colorClass: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
      },
      {
        type: "database",
        label: "数据库",
        description: "数据库读写操作",
        icon: Database,
        colorClass: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
      },
      {
        type: "email",
        label: "邮件",
        description: "发送邮件通知",
        icon: Mail,
        colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
      },
      {
        type: "variable",
        label: "变量",
        description: "设置流程变量",
        icon: Variable,
        colorClass: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
      },
      {
        type: "delay",
        label: "延迟",
        description: "等待指定时间",
        icon: Clock,
        colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
      },
    ],
  },
  {
    id: "logic",
    label: "逻辑",
    items: [
      {
        type: "condition",
        label: "条件",
        description: "分支条件判断",
        icon: GitBranch,
        colorClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
      },
      {
        type: "switch",
        label: "多分支",
        description: "多路分支选择",
        icon: GitFork,
        colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
      },
      {
        type: "loop",
        label: "循环",
        description: "循环执行子流程",
        icon: Repeat,
        colorClass: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
      },
      {
        type: "parallel",
        label: "并行",
        description: "并行执行多个分支",
        icon: Layers,
        colorClass: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
      },
    ],
  },
  {
    id: "others",
    label: "其他",
    items: [
      {
        type: "end",
        label: "结束",
        description: "流程结束节点",
        icon: Square,
        colorClass: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
      },
    ],
  },
];

const ALL_COMPONENTS = COMPONENT_CATEGORIES.flatMap((c) => c.items);

const PREDEFINED_TAGS = ["能耗", "报警", "定时", "数据同步", "通知", "设备联动", "数据清洗"];

interface WorkflowCanvasProps {
  workflowId: string | null;
  onBack: () => void;
}

export default function WorkflowCanvas({ workflowId, onBack }: WorkflowCanvasProps) {
  const [nodes, setNodes, _onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<Edge>([]);
  const [dsl, setDsl] = useState<WorkflowDSL | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [activeConfigTab, setActiveConfigTab] = useState("config");
  const [isDirty, setIsDirty] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLDivElement>(null);

  // Click outside to close tag dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(e.target as globalThis.Node)) {
        setTagPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // Load workflow data
  useEffect(() => {
    if (!workflowId) {
      const defaultDsl: WorkflowDSL = {
        version: "1.0",
        trigger: { type: "manual", config: {} },
        nodes: [
          { id: "start", type: "start", name: "开始", config: {} },
          { id: "end", type: "end", name: "结束", config: {} },
        ],
        edges: [{ id: "e-start-end", source: "start", target: "end" }],
      };
      setDsl(defaultDsl);
      const { nodes: n, edges: e } = dslToReactFlow(defaultDsl);
      setNodes(autoLayout(n, e));
      setEdges(e);
      return;
    }

    setLoading(true);
    workflowsApi
      .getById(workflowId)
      .then((wf) => {
        setWorkflow(wf);
        const loadedDsl = wf.dsl;
        setDsl(loadedDsl);
        const { nodes: n, edges: e } = dslToReactFlow(loadedDsl);
        setNodes(n.length > 0 ? autoLayout(n, e) : n);
        setEdges(e);
      })
      .catch(() => {
        // silently fail
      })
      .finally(() => setLoading(false));
  }, [workflowId, setNodes, setEdges]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof _onNodesChange>[0]) => {
      setIsDirty(true);
      _onNodesChange(changes);
    },
    [_onNodesChange],
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof _onEdgesChange>[0]) => {
      setIsDirty(true);
      _onEdgesChange(changes);
    },
    [_onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setIsDirty(true);
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: connection.sourceHandle ? "condition" : "default",
        label: connection.sourceHandle ?? undefined,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setRightPanelOpen(true);
    setActiveConfigTab("config");
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setRightPanelOpen(false);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!rfInstance) return;

      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const item = ALL_COMPONENTS.find((c) => c.type === type);
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: item?.label ?? type, type, config: {} },
      };

      setIsDirty(true);
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setIsDirty(true);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      setRightPanelOpen(false);
    },
    [setNodes, setEdges],
  );

  const handleSave = useCallback(async () => {
    if (!dsl) return;
    setSaving(true);
    try {
      const newDsl = reactFlowToDSL(nodes, edges, dsl.trigger);
      if (workflowId) {
        await workflowsApi.update(workflowId, {
          name: workflow?.name,
          dsl: newDsl,
        });
      }
      setDsl(newDsl);
      setIsDirty(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }, [dsl, nodes, edges, workflowId, workflow?.name]);

  const handlePublish = useCallback(async () => {
    if (!workflowId) return;
    setPublishing(true);
    try {
      await handleSave();
      await workflowsApi.update(workflowId, { enabled: true });
      setWorkflow((prev) => (prev ? { ...prev, enabled: true } : prev));
    } catch {
      // silently fail
    } finally {
      setPublishing(false);
    }
  }, [workflowId, handleSave]);

  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => autoLayout(nds, edges));
    setIsDirty(true);
    requestAnimationFrame(() => {
      rfInstance?.fitView({ padding: 0.2 });
    });
  }, [edges, setNodes, rfInstance]);

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // Update node data from panel
  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<Node["data"]>) => {
      setIsDirty(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [setNodes],
  );

  // Warn before closing tab with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const workflowName =
    workflow?.name ?? dsl?.nodes?.find((n) => n.type === "start")?.name ?? "未命名工作流";
  const isPublished = workflow?.enabled ?? false;

  // Name editing handlers
  const handleNameClick = useCallback(() => {
    setEditingName(true);
    setEditedName(workflowName);
  }, [workflowName]);

  const handleNameCommit = useCallback(() => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== workflowName) {
      setWorkflow((prev) => (prev ? { ...prev, name: trimmed } : prev));
      setIsDirty(true);
    }
    setEditingName(false);
  }, [editedName, workflowName]);

  const handleNameCancel = useCallback(() => {
    setEditingName(false);
  }, []);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleNameCommit();
      if (e.key === "Escape") handleNameCancel();
    },
    [handleNameCommit, handleNameCancel],
  );

  // Edit dialog handlers
  const handleOpenEditDialog = useCallback(() => {
    setEditTitle(workflow?.name ?? workflowName);
    const tags = (dsl?.trigger?.config?.tags as string[]) ?? [];
    setEditTags(Array.isArray(tags) ? tags : []);
    setEditDescription(workflow?.description ?? "");
    setTagInput("");
    setShowEditDialog(true);
  }, [workflow, workflowName, dsl]);

  const handleSaveWorkflowInfo = useCallback(async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    const newTrigger = dsl?.trigger
      ? {
          ...dsl.trigger,
          config: { ...dsl.trigger.config, tags: editTags },
        }
      : { type: "manual" as const, config: { tags: editTags } };

    if (workflowId && dsl) {
      try {
        await workflowsApi.update(workflowId, {
          name: trimmed,
          description: editDescription.trim() || undefined,
          dsl: { ...dsl, trigger: newTrigger },
        });
      } catch {
        // silently fail
      }
    }

    setWorkflow((prev) =>
      prev ? { ...prev, name: trimmed, description: editDescription.trim() || null } : prev,
    );
    setDsl((prev) => (prev ? { ...prev, trigger: newTrigger } : prev));
    setIsDirty(true);
    setShowEditDialog(false);
  }, [editTitle, editTags, editDescription, workflowId, dsl]);

  // Back button with dirty check
  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      onBack();
    }
  }, [isDirty, onBack]);

  const selectedNodeType = selectedNode?.type as string;
  const canDelete = selectedNodeType !== "start" && selectedNodeType !== "end" && !!selectedNode;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return COMPONENT_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return COMPONENT_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Navigation Bar */}
      <div className="flex h-12 items-center justify-between border-b bg-white px-4 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={handleBack}>
            <ChevronRight size={14} className="rotate-180" />
            <span className="text-sm">返回</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          {editingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-[240px] text-sm font-medium"
              autoFocus
            />
          ) : (
            <>
              <button
                onClick={handleNameClick}
                className="max-w-[300px] truncate text-sm font-medium hover:text-primary"
                title="点击修改名称"
              >
                {workflowName}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenEditDialog}
                title="编辑工作流信息"
              >
                <Pencil size={14} />
              </Button>
            </>
          )}
          <Badge variant={isPublished ? "default" : "secondary"} className="text-[10px]">
            {isPublished ? "已发布" : "草稿"}
          </Badge>
          {isDirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="有未保存的修改" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleAutoLayout}>
            <LayoutTemplate size={14} />
            自动布局
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Zap size={14} />
            测试运行
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={14} />
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            onClick={handlePublish}
            disabled={publishing || !workflowId}
          >
            <Play size={14} />
            {publishing ? "发布中..." : "发布"}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="设置">
            <Settings size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="更多">
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Nodes */}
        <div className="flex w-[260px] flex-col border-r bg-zinc-50 dark:bg-zinc-950">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">节点库</h3>
          </div>
          <div className="px-3 py-2">
            <div className="relative">
              <Search
                size={14}
                className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <Input
                placeholder="搜索节点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
              {searchQuery && (
                <button
                  className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 px-2 pb-4">
              {filteredCategories.map((category) => {
                const isCollapsed = collapsedCategories.has(category.id);
                return (
                  <div key={category.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => {
                          const next = new Set(prev);
                          if (next.has(category.id)) {
                            next.delete(category.id);
                          } else {
                            next.add(category.id);
                          }
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-1 px-2 py-1.5"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={12} className="text-muted-foreground" />
                      ) : (
                        <ChevronDown size={12} className="text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                        {category.label}
                      </span>
                    </button>
                    {!isCollapsed &&
                      category.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.type}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData("application/reactflow", item.type)
                            }
                            className="flex cursor-grab items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 active:cursor-grabbing"
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${item.colorClass}`}
                            >
                              <Icon size={14} />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-xs font-medium">{item.label}</span>
                              <span className="text-muted-foreground truncate text-[10px]">
                                {item.description}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
              {filteredCategories.length === 0 && (
                <div className="text-muted-foreground px-2 py-4 text-center text-xs">
                  未找到匹配的节点
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="relative flex-1 bg-zinc-50 dark:bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={setRfInstance}
            nodeTypes={NODE_TYPES}
            fitView
            attributionPosition="bottom-right"
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              className="bg-zinc-50 dark:bg-zinc-950"
            />
            <Controls className="!bg-white !shadow-sm dark:!bg-zinc-900" />
            <MiniMap
              className="!bg-white/80 !shadow-sm dark:!bg-zinc-900/80"
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
          </ReactFlow>
        </div>

        {/* Right Config Panel */}
        {rightPanelOpen && selectedNode && (
          <div className="flex w-[320px] flex-col border-l bg-white dark:bg-zinc-900">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-semibold">
                  {(selectedNode.data.label as string) ?? selectedNode.type}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setRightPanelOpen(false)}
              >
                <X size={14} />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeConfigTab}
              onValueChange={setActiveConfigTab}
              className="flex flex-1 flex-col"
            >
              <div className="mx-4 mt-3 flex gap-6 border-b">
                <button
                  onClick={() => setActiveConfigTab("config")}
                  className={`pb-2 text-sm font-medium transition-colors ${
                    activeConfigTab === "config"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Config
                </button>
                <button
                  onClick={() => setActiveConfigTab("history")}
                  className={`pb-2 text-sm font-medium transition-colors ${
                    activeConfigTab === "history"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  History
                </button>
              </div>

              <TabsContent value="config" className="mt-0 flex-1">
                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div className="space-y-5 p-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Node Name</Label>
                      <Input
                        value={(selectedNode.data.label as string) ?? ""}
                        onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                        className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                      />
                    </div>
                    {selectedNodeType === "condition" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Expression</Label>
                        <Input
                          value={
                            (((selectedNode.data.config as Record<string, unknown>) ?? {})
                              ?.expression as string) ?? ""
                          }
                          placeholder="e.g. temperature > 30"
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              config: {
                                ...(selectedNode.data.config as Record<string, unknown>),
                                expression: e.target.value,
                              },
                            })
                          }
                          className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                        />
                      </div>
                    )}
                    {selectedNodeType === "http_request" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Method</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.method as string) ?? "GET"
                            }
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  method: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">URL</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.url as string) ?? ""
                            }
                            placeholder="https://api.example.com/..."
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  url: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                      </>
                    )}
                    {selectedNodeType === "delay" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Duration (milliseconds)
                        </Label>
                        <Input
                          type="number"
                          value={
                            (((selectedNode.data.config as Record<string, unknown>) ?? {})
                              ?.durationMs as number) ?? 1000
                          }
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              config: {
                                ...(selectedNode.data.config as Record<string, unknown>),
                                durationMs: Number(e.target.value),
                              },
                            })
                          }
                          className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                        />
                      </div>
                    )}
                    {selectedNodeType === "variable" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Variable Name</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.name as string) ?? ""
                            }
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  name: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Variable Value</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.value as string) ?? ""
                            }
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  value: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                      </>
                    )}
                    {selectedNodeType === "email" && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Template</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.template as string) ?? ""
                            }
                            placeholder="welcome.html"
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  template: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">To</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.to as string) ?? ""
                            }
                            placeholder="{{ user.email }}"
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  to: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <Input
                            value={
                              (((selectedNode.data.config as Record<string, unknown>) ?? {})
                                ?.subject as string) ?? ""
                            }
                            placeholder="Welcome to our platform!"
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                config: {
                                  ...(selectedNode.data.config as Record<string, unknown>),
                                  subject: e.target.value,
                                },
                              })
                            }
                            className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                          />
                        </div>
                      </>
                    )}
                    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        Configure the node parameters above. Changes will be applied when you save
                        the workflow.
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="mt-0 flex-1">
                <div className="flex h-[calc(100vh-220px)] flex-col items-center justify-center gap-2 p-4">
                  <div className="text-muted-foreground text-sm">No execution history</div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Panel Footer */}
            <div className="border-t p-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-9 flex-1 text-xs"
                  onClick={() => selectedNode && updateNodeData(selectedNode.id, selectedNode.data)}
                >
                  Update Node
                </Button>
                {canDelete && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950"
                    onClick={() => selectedNode && handleDeleteNode(selectedNode.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit workflow info dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑工作流信息</DialogTitle>
            <DialogDescription>修改工作流的标题、标签和描述</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wf-title" className="text-xs text-muted-foreground">
                标题
              </Label>
              <Input
                id="wf-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="工作流名称"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">标签</Label>
              {/* Tag autocomplete */}
              <div
                ref={tagInputRef}
                className="relative flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-white px-2 py-1 dark:bg-zinc-950"
              >
                {editTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                      className="rounded-full p-0.5 hover:bg-muted"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
                <Input
                  placeholder={editTags.length === 0 ? "输入或选择标签..." : ""}
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setTagPopoverOpen(true);
                  }}
                  onFocus={() => setTagPopoverOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!editTags.includes(newTag)) {
                        setEditTags((prev) => [...prev, newTag]);
                      }
                      setTagInput("");
                      setTagPopoverOpen(false);
                    }
                    if (e.key === "Backspace" && !tagInput && editTags.length > 0) {
                      setEditTags((prev) => prev.slice(0, -1));
                    }
                  }}
                  className="h-6 min-w-[80px] flex-1 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
                />
                {tagPopoverOpen && (
                  <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {PREDEFINED_TAGS.filter(
                        (t) =>
                          !editTags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()),
                      ).length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {tagInput.trim() ? `按回车添加 "${tagInput.trim()}"` : "暂无可用标签"}
                        </div>
                      ) : (
                        PREDEFINED_TAGS.filter(
                          (t) =>
                            !editTags.includes(t) &&
                            t.toLowerCase().includes(tagInput.toLowerCase()),
                        ).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setEditTags((prev) => [...prev, t]);
                              setTagInput("");
                              setTagPopoverOpen(false);
                            }}
                          >
                            {t}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-desc" className="text-xs text-muted-foreground">
                描述
              </Label>
              <Textarea
                id="wf-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="输入工作流描述..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveWorkflowInfo}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave without saving confirmation */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认离开</DialogTitle>
            <DialogDescription>有未保存的修改，离开后将丢失。是否继续？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              留在当前页面
            </Button>
            <Button variant="destructive" onClick={onBack}>
              离开
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
