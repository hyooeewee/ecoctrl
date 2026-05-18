import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
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
import { LayoutTemplate, Copy, Trash2, Undo2, Braces } from "lucide-react";
import { toast } from "sonner";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@ecoctrl/ui/context-menu";
import { Kbd } from "@ecoctrl/ui/kbd";

import { workflowsApi } from "@/api/workflows";
import { pointsApi } from "@/api/points";
import type { WorkflowDSL, WorkflowListItem, EnvVar } from "./types";
import { dslToReactFlow, getDefaultSettings } from "./transform";
import { autoLayout } from "./layout";
import { usePluginNodes } from "./hooks/usePluginNodes";
import { useWorkflowHistory } from "./hooks/useWorkflowHistory";
import { useWorkflowKeyboard } from "./hooks/useWorkflowKeyboard";
import { useWorkflowPersistence } from "./hooks/useWorkflowPersistence";
import { DragNodePreview } from "./nodes/DragNodePreview";
import { BUILT_IN_NODE_TYPES, PLUGIN_NODE_SHELLS, COMPONENT_CATEGORIES } from "./constants";

import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowLibrary } from "./WorkflowLibrary";
import { WorkflowTestPanel } from "./WorkflowTestPanel";
import { WorkflowNodeConfig } from "./WorkflowNodeConfig";
import { WorkflowDialogs } from "./WorkflowDialogs";

interface WorkflowCanvasProps {
  workflowId: string | null;
  onBack: () => void;
}

export default function WorkflowCanvas({ workflowId, onBack }: WorkflowCanvasProps) {
  const [nodes, setNodes, _onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<Edge>([]);
  const { pluginNodes, getPluginNodeDef } = usePluginNodes();
  const { undo } = useWorkflowHistory();

  const [dsl, setDsl] = useState<WorkflowDSL | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowListItem | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [settings, setSettings] =
    useState<NonNullable<WorkflowDSL["settings"]>>(getDefaultSettings());

  const {
    saving,
    publishing,
    testing,
    testLogOpen,
    setTestLogOpen,
    testResult,
    isDirty,
    setIsDirty,
    autoSaveStatus,
    handleSave,
    handlePublish,
    handleTestRun,
  } = useWorkflowPersistence({
    dsl,
    nodes,
    edges,
    workflowId,
    workflow,
    envVars,
    settings,
    setDsl,
    setWorkflow,
  });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [activeConfigTab, setActiveConfigTab] = useState("config");
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [pointNames, setPointNames] = useState<string[]>([]);
  const [pointSearch, setPointSearch] = useState("");
  const [handleMenu, setHandleMenu] = useState<{
    nodeId: string;
    handleId?: string;
    handleType: "target" | "source";
    x: number;
    y: number;
    flowX?: number;
    flowY?: number;
  } | null>(null);

  // Dialogs
  const [showEnvVarsDialog, setShowEnvVarsDialog] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // Selection & copy-paste
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    target: "pane" | "node";
  }>({ x: 0, y: 0, visible: false, target: "pane" });
  const copiedNodesRef = useRef<Node[]>([]);

  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const filteredPointNames = useMemo(
    () =>
      pointSearch
        ? pointNames.filter((name) => name.toLowerCase().includes(pointSearch.toLowerCase()))
        : pointNames,
    [pointNames, pointSearch],
  );
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
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const connectingRef = useRef<{
    nodeId: string;
    handleId?: string;
    handleType: "target" | "source";
  } | null>(null);
  const menuOpenedAtRef = useRef(0);
  const connectionMadeRef = useRef(false);

  // Push state to undo history
  const _pushHistory = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({
      nodes: currentNodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
      edges: currentEdges.map((e) => ({ ...e })),
    });
    historyIndexRef.current = historyRef.current.length - 1;
    // Cap history at 50 entries
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
  }, []);

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
      const layouted = autoLayout(n, e);
      setNodes(layouted);
      setEdges(e);
      historyRef.current = [
        { nodes: layouted.map((n) => ({ ...n })), edges: e.map((e) => ({ ...e })) },
      ];
      historyIndexRef.current = 0;
      return;
    }

    setLoading(true);
    workflowsApi
      .getById(workflowId)
      .then((wf) => {
        setWorkflow(wf);
        const loadedDsl = wf.dsl;
        setDsl(loadedDsl);
        setEnvVars(loadedDsl.envVars ?? []);
        setSettings(loadedDsl.settings ?? getDefaultSettings());
        const { nodes: n, edges: e } = dslToReactFlow(loadedDsl);
        const needsLayout = n.some((node) => !node.position);
        const finalNodes = needsLayout ? autoLayout(n, e) : n;
        setNodes(finalNodes);
        setEdges(e);
        historyRef.current = [
          { nodes: finalNodes.map((n) => ({ ...n })), edges: e.map((e) => ({ ...e })) },
        ];
        historyIndexRef.current = 0;
      })
      .catch(() => {
        // silently fail
      })
      .finally(() => setLoading(false));
  }, [workflowId, setNodes, setEdges]);

  // Load point names for dropdown
  useEffect(() => {
    pointsApi
      .list()
      .then((points) => {
        setPointNames(points.map((p) => p.name).filter(Boolean));
      })
      .catch(() => {
        // silently fail
      });
  }, []);

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
      connectionMadeRef.current = true;
      connectingRef.current = null;
      setIsDirty(true);
      _pushHistory(nodesRef.current, edges);
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: connection.sourceHandle ? "condition" : "default",
        label: connection.sourceHandle ?? undefined,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, _pushHistory, edges],
  );

  const onConnectStart = useCallback(
    (
      _: MouseEvent | TouchEvent,
      params: {
        nodeId: string | null;
        handleId: string | null;
        handleType: "target" | "source" | null;
      },
    ) => {
      if (!params.nodeId || !params.handleType) return;
      connectingRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId ?? undefined,
        handleType: params.handleType,
      };
    },
    [],
  );

  const onConnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      connectionState?: {
        fromNode?: { id: string } | null;
        fromHandle?: { id?: string | null; type?: string | null } | null;
        connection?: Connection | null;
      },
    ) => {
      // If a connection was successfully made (either via connectionState or onConnect), don't show the menu
      if (connectionMadeRef.current) {
        connectionMadeRef.current = false;
        connectingRef.current = null;
        return;
      }
      const isConnected = connectionState?.connection != null;
      if (isConnected) {
        connectingRef.current = null;
        return;
      }

      // Prefer connectionState (React Flow v12), fallback to ref
      const fromNode = connectionState?.fromNode;
      const fromHandle = connectionState?.fromHandle;

      let nodeId: string;
      let handleId: string | undefined;
      let handleType: "target" | "source";

      if (fromNode && fromHandle) {
        nodeId = fromNode.id;
        handleId = fromHandle.id ?? undefined;
        handleType = (fromHandle.type as "target" | "source") ?? "source";
      } else if (connectingRef.current) {
        nodeId = connectingRef.current.nodeId;
        handleId = connectingRef.current.handleId;
        handleType = connectingRef.current.handleType;
      } else {
        return;
      }

      connectingRef.current = null;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const clientX = (event as MouseEvent).clientX;
      const clientY = (event as MouseEvent).clientY;

      // Only show menu if released inside the canvas
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }

      // Convert screen position to flow position for node placement
      const flowPos = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });

      const menuWidth = 200;
      const menuHeight = 320;
      const menuOffset = handleType === "source" ? 12 : -212;
      let menuX = clientX - rect.left + menuOffset;
      let menuY = clientY - rect.top - 12;
      // Clamp to canvas bounds
      menuX = Math.max(4, Math.min(menuX, rect.width - menuWidth - 4));
      menuY = Math.max(4, Math.min(menuY, rect.height - menuHeight - 4));

      setHandleMenu({
        nodeId,
        handleId,
        handleType,
        x: menuX,
        y: menuY,
        flowX: flowPos?.x,
        flowY: flowPos?.y,
      });

      // Guard against onPaneClick immediately closing the menu
      menuOpenedAtRef.current = Date.now();
    },
    [],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setRightPanelOpen(true);
    setActiveConfigTab("config");
  }, []);

  const onPaneClick = useCallback(() => {
    // Ignore pane clicks that immediately follow an onConnectEnd menu open
    if (Date.now() - menuOpenedAtRef.current < 150) {
      return;
    }
    setSelectedNode(null);
    setRightPanelOpen(false);
    setHandleMenu(null);
  }, []);

  const onNodeDragStop = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setSelectedNode(null);
    setRightPanelOpen(false);
  }, [setNodes]);

  // Refs for stable callbacks inside node data
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const handleAddNodeFromHandle = useCallback(
    (
      nodeId: string,
      handleId?: string,
      handleType?: "target" | "source",
      edgeX?: number,
      edgeY?: number,
    ) => {
      if (edgeX == null || edgeY == null || !handleType) return;
      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 320; // approximate max height of popup
      const offset = 8;
      let x: number;
      if (handleType === "source") {
        x = edgeX - rect.left + offset;
      } else {
        x = edgeX - rect.left - menuWidth - offset;
      }
      // Clamp to canvas bounds
      x = Math.max(4, Math.min(x, rect.width - menuWidth - 4));
      let y = edgeY - rect.top - 12;
      y = Math.max(4, Math.min(y, rect.height - menuHeight - 4));
      setHandleMenu({
        nodeId,
        handleId,
        handleType,
        x,
        y,
      });
    },
    [],
  );

  const handleSelectNodeFromMenu = useCallback(
    (type: string) => {
      if (!handleMenu) return;
      const { nodeId, handleId, handleType } = handleMenu;
      const currentNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!currentNode) return;

      const item = pluginNodes.find((p) => p.id === type);
      const newNodeId = `${type}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position:
          handleMenu.flowX != null && handleMenu.flowY != null
            ? { x: handleMenu.flowX, y: handleMenu.flowY }
            : {
                x:
                  handleType === "source"
                    ? currentNode.position.x + 350
                    : currentNode.position.x - 350,
                y: currentNode.position.y,
              },
        data: { label: item?.name ?? type, type, config: {} },
      };

      let newEdge: Edge;
      if (handleType === "source") {
        newEdge = {
          id: `e-${nodeId}-${newNodeId}-${Date.now()}`,
          source: nodeId,
          target: newNodeId,
          sourceHandle: handleId,
          type: handleId ? "condition" : "default",
          label: handleId ?? undefined,
        };
      } else {
        newEdge = {
          id: `e-${newNodeId}-${nodeId}-${Date.now()}`,
          source: newNodeId,
          target: nodeId,
          targetHandle: handleId,
          type: "default",
        };
      }

      setIsDirty(true);
      _pushHistory(nodesRef.current, edges);
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => addEdge(newEdge, eds));
      setHandleMenu(null);
    },
    [handleMenu, setNodes, setEdges, _pushHistory, edges],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent, type: string) => {
      event.dataTransfer.setData("application/reactflow", type);
      event.dataTransfer.effectAllowed = "move";

      const item = pluginNodes.find((p) => p.id === type);
      const nodeData = { label: item?.name ?? type, type, config: {} };

      const container = document.createElement("div");
      const existingNode = document.querySelector(".react-flow__node");
      let scale = 1;
      if (existingNode) {
        scale = existingNode.getBoundingClientRect().width / 280;
      } else if (rfInstance) {
        scale = rfInstance.getViewport().zoom;
      }
      container.style.cssText = "position:fixed;top:-100px;left:0;pointer-events:none;";
      // @ts-expect-error zoom is non-standard but works reliably in Chrome for setDragImage
      container.style.zoom = scale;
      document.body.appendChild(container);

      try {
        const root = createRoot(container);
        flushSync(() => {
          root.render(
            <div className="react-flow__node" style={{ pointerEvents: "none" }}>
              <DragNodePreview type={type} data={nodeData} />
            </div>,
          );
        });

        dragCleanupRef.current = () => {
          root.unmount();
          if (container.parentNode) document.body.removeChild(container);
        };

        event.dataTransfer.setDragImage(container, 140 * scale, 28 * scale);
      } catch {
        if (container.parentNode) document.body.removeChild(container);
      }
    },
    [rfInstance],
  );

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

      const plugin = pluginNodes.find((p) => p.id === type);
      const config: Record<string, unknown> = {};

      // Pin plugin version at drop time to avoid non-deterministic execution
      const def = getPluginNodeDef(type);
      if (def) {
        config.__version = def.version;
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: plugin?.name ?? type, type, config },
      };

      setIsDirty(true);
      _pushHistory(nodesRef.current, edges);
      setNodes((nds) => [...nds, newNode]);
    },
    [rfInstance, setNodes, pluginNodes, getPluginNodeDef, _pushHistory, edges],
  );

  const onDragEnd = useCallback(() => {
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setIsDirty(true);
      _pushHistory(nodesRef.current, edges);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      setRightPanelOpen(false);
    },
    [setNodes, setEdges, _pushHistory, edges],
  );

  const handleAutoLayout = useCallback(() => {
    _pushHistory(nodesRef.current, edges);
    setNodes((nds) => autoLayout(nds, edges));
    setIsDirty(true);
    requestAnimationFrame(() => {
      rfInstance?.fitView({ padding: 0.2 });
    });
  }, [edges, setNodes, rfInstance, _pushHistory]);

  // Keyboard shortcuts
  useWorkflowKeyboard({
    nodesRef,
    edges,
    selectedNodeIds,
    copiedNodesRef,
    setNodes,
    setEdges,
    setIsDirty,
    _pushHistory,
    undo,
    setSelectedNodeIds,
    handleSave,
  });

  // Update node data from panel
  const updateNodeData = useCallback(
    (nodeId: string, updates: Partial<Node["data"]>) => {
      setIsDirty(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
      setSelectedNode((prev) =>
        prev && prev.id === nodeId ? { ...prev, data: { ...prev.data, ...updates } } : prev,
      );
    },
    [setNodes],
  );

  // Memoize nodes with callbacks to avoid re-creating objects on every render
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onAddNodeFromHandle: handleAddNodeFromHandle },
      })),
    [nodes, handleAddNodeFromHandle],
  );

  // Dynamic node types including plugin nodes
  const nodeTypes = useMemo(() => {
    const types: Record<string, React.ComponentType<any>> = { ...BUILT_IN_NODE_TYPES };
    for (const plugin of pluginNodes) {
      const Shell = PLUGIN_NODE_SHELLS[plugin.category];
      if (Shell) types[plugin.id] = Shell;
    }
    return types;
  }, [pluginNodes]);

  // Component categories with plugin section
  const componentCategories = useMemo(() => {
    const categories = [...COMPONENT_CATEGORIES];
    if (pluginNodes.length > 0) {
      categories.push({
        id: "plugins",
        label: "插件节点",
        items: pluginNodes.map((p) => ({
          type: p.id,
          label: p.name,
          description: p.description || "",
          icon: LayoutTemplate,
          colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
        })),
      });
    }
    return categories;
  }, [pluginNodes]);

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
    if (!searchQuery.trim()) return componentCategories;
    const q = searchQuery.toLowerCase();
    return componentCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [searchQuery, componentCategories]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WorkflowToolbar
        workflowName={workflowName}
        isPublished={isPublished}
        isDirty={isDirty}
        editingName={editingName}
        editedName={editedName}
        saving={saving}
        publishing={publishing}
        testing={testing}
        autoSaveStatus={autoSaveStatus}
        workflowId={workflowId}
        onBack={handleBack}
        onNameClick={handleNameClick}
        onNameCommit={handleNameCommit}
        onNameCancel={handleNameCancel}
        onNameChange={setEditedName}
        onNameKeyDown={handleNameKeyDown}
        onEditDialog={handleOpenEditDialog}
        onTestRun={handleTestRun}
        onSave={handleSave}
        onPublish={handlePublish}
        onEnvVars={() => setShowEnvVarsDialog(true)}
        onSettings={() => setShowSettingsDialog(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <WorkflowLibrary
          libraryOpen={libraryOpen}
          searchQuery={searchQuery}
          collapsedCategories={collapsedCategories}
          filteredCategories={filteredCategories}
          onLibraryToggle={() => setLibraryOpen((v) => !v)}
          onSearchChange={setSearchQuery}
          onCategoryToggle={(id) =>
            setCollapsedCategories((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        />

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="workflow-editor-canvas relative flex flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950"
        >
          <style>{`
            .workflow-editor-canvas .react-flow__pane.draggable,
            .workflow-editor-canvas .react-flow__node.draggable,
            .workflow-editor-canvas .react-flow__node.selectable {
              cursor: default;
            }
            .workflow-editor-canvas .react-flow__pane.dragging,
            .workflow-editor-canvas .react-flow__node.dragging {
              cursor: grabbing;
            }
            .workflow-editor-canvas .react-flow__pane.selection {
              cursor: crosshair;
            }
            .workflow-editor-canvas .react-flow__handle {
              transform: translate(-50%, -50%) scale(1.4);
            }
            .workflow-editor-canvas .react-flow__handle-right {
              transform: translate(50%, -50%) scale(1.4);
            }
          `}</style>
          <div className="flex-1 overflow-hidden">
            <ReactFlow
              nodes={nodesWithCallbacks}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onNodeDragStop={onNodeDragStop}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onInit={setRfInstance}
              nodeTypes={nodeTypes}
              onSelectionChange={({ nodes }) => setSelectedNodeIds(nodes.map((n) => n.id))}
              onPaneContextMenu={(e) => {
                e.preventDefault();
                const wrapper = reactFlowWrapper.current;
                if (!wrapper) return;
                const rect = wrapper.getBoundingClientRect();
                setContextMenu({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  visible: true,
                  target: "pane",
                });
              }}
              onNodeContextMenu={(e, node) => {
                e.preventDefault();
                const wrapper = reactFlowWrapper.current;
                if (!wrapper) return;
                const rect = wrapper.getBoundingClientRect();
                const el = wrapper.querySelector(`[data-id="${node.id}"]`);
                let x = node.position.x;
                let y = node.position.y;
                if (el) {
                  const elRect = el.getBoundingClientRect();
                  x = elRect.left - rect.left + elRect.width / 2;
                  y = elRect.top - rect.top + elRect.height / 2;
                }
                setContextMenu({ x, y, visible: true, target: "node" });
              }}
              selectionOnDrag
              panOnDrag={[1, 2]}
              panOnScroll
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
              <Controls className="!bg-white !shadow-sm dark:!bg-zinc-900">
                <ControlButton onClick={handleAutoLayout} title="自动布局" className="border-t">
                  <LayoutTemplate size={16} />
                </ControlButton>
              </Controls>
              <MiniMap
                className="!bg-white/80 !shadow-sm dark:!bg-zinc-900/80"
                nodeStrokeWidth={3}
                zoomable
                pannable
              />
            </ReactFlow>

            {/* Context menu */}
            <ContextMenu
              open={contextMenu.visible}
              onOpenChange={(open) => setContextMenu((prev) => ({ ...prev, visible: open }))}
            >
              <ContextMenuContent
                className="w-52"
                anchor={() => {
                  const wrapper = reactFlowWrapper.current;
                  const x = wrapper
                    ? wrapper.getBoundingClientRect().left + contextMenu.x
                    : contextMenu.x;
                  const y = wrapper
                    ? wrapper.getBoundingClientRect().top + contextMenu.y
                    : contextMenu.y;
                  return {
                    getBoundingClientRect() {
                      return DOMRect.fromRect({ x, y, width: 0, height: 0 });
                    },
                  };
                }}
                align="start"
                side="right"
                sideOffset={0}
              >
                {contextMenu.target === "node" && (
                  <>
                    <ContextMenuItem
                      onClick={() => {
                        const selected = nodesRef.current.filter((n) =>
                          selectedNodeIds.includes(n.id),
                        );
                        if (selected.length > 0) {
                          copiedNodesRef.current = selected;
                          toast.success(`已复制 ${selected.length} 个节点`);
                        }
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <Copy size={14} />
                      复制
                      <ContextMenuShortcut>
                        <Kbd className="h-5 min-w-5 px-1 text-[10px]">Ctrl</Kbd>
                        <Kbd className="h-5 min-w-5 px-1 text-[10px]">C</Kbd>
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem
                  onClick={() => {
                    const copied = copiedNodesRef.current;
                    if (copied.length === 0) {
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                      return;
                    }
                    const idMap = new Map<string, string>();
                    const newNodes: Node[] = copied.map((n) => {
                      const newId = `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                      idMap.set(n.id, newId);
                      return {
                        ...n,
                        id: newId,
                        position: { x: n.position.x + 30, y: n.position.y + 30 },
                        selected: false,
                      };
                    });
                    const newEdges: Edge[] = edges
                      .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
                      .map((edge) => ({
                        ...edge,
                        id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}-${Date.now()}`,
                        source: idMap.get(edge.source)!,
                        target: idMap.get(edge.target)!,
                      }));
                    setIsDirty(true);
                    _pushHistory(nodesRef.current, edges);
                    setNodes((nds) => [...nds, ...newNodes]);
                    if (newEdges.length > 0) setEdges((eds) => [...eds, ...newEdges]);
                    toast.success(`已粘贴 ${copied.length} 个节点`);
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  <Braces size={14} />
                  粘贴
                  <ContextMenuShortcut>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">Ctrl</Kbd>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">V</Kbd>
                  </ContextMenuShortcut>
                </ContextMenuItem>
                {contextMenu.target === "node" && selectedNodeIds.length > 0 && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      variant="destructive"
                      onClick={() => {
                        setIsDirty(true);
                        _pushHistory(nodesRef.current, edges);
                        setNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
                        setEdges((eds) =>
                          eds.filter(
                            (e) =>
                              !selectedNodeIds.includes(e.source) &&
                              !selectedNodeIds.includes(e.target),
                          ),
                        );
                        setSelectedNodeIds([]);
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <Trash2 size={14} />
                      删除
                      <ContextMenuShortcut>
                        <Kbd className="h-5 min-w-5 px-1 text-[10px]">Del</Kbd>
                      </ContextMenuShortcut>
                    </ContextMenuItem>
                  </>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => {
                    const allIds = nodesRef.current.map((n) => n.id);
                    setSelectedNodeIds(allIds);
                    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  <Copy size={14} />
                  全选
                  <ContextMenuShortcut>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">Ctrl</Kbd>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">A</Kbd>
                  </ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={historyIndexRef.current <= 0}
                  onClick={() => {
                    undo(setNodes, setEdges, () => {
                      setSelectedNodeIds([]);
                      toast.success("已撤销");
                    });
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  <Undo2 size={14} />
                  撤销
                  <ContextMenuShortcut>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">Ctrl</Kbd>
                    <Kbd className="h-5 min-w-5 px-1 text-[10px]">Z</Kbd>
                  </ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>

            {/* Handle click node picker popup */}
            {handleMenu && (
              <div
                className="absolute z-50 w-[200px] overflow-hidden rounded-lg border bg-white shadow-lg dark:bg-zinc-900 dark:border-zinc-700"
                style={{ left: handleMenu.x, top: handleMenu.y }}
              >
                <div className="border-b px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {handleMenu.handleType === "source" ? "选择下一步节点" : "选择上一步节点"}
                  </span>
                </div>
                <div className="max-h-[280px] overflow-y-auto py-1">
                  {(() => {
                    const isSource = handleMenu.handleType === "source";
                    const currentNodeIsStart =
                      nodes.find((n) => n.id === handleMenu.nodeId)?.type === "start";
                    return componentCategories.map((cat) => {
                      const items = cat.items.filter((item) => {
                        if (isSource) return item.type !== "start";
                        return !(currentNodeIsStart && item.type === "start");
                      });
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {cat.label}
                          </div>
                          {items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => handleSelectNodeFromMenu(item.type)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <div
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${item.colorClass}`}
                                >
                                  <Icon size={10} />
                                </div>
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          <WorkflowTestPanel
            testResult={testResult}
            testLogOpen={testLogOpen}
            onToggle={() => setTestLogOpen((v) => !v)}
          />
        </div>

        {rightPanelOpen && selectedNode && (
          <WorkflowNodeConfig
            selectedNode={selectedNode}
            selectedNodeType={selectedNodeType}
            activeConfigTab={activeConfigTab}
            onTabChange={setActiveConfigTab}
            updateNodeData={updateNodeData}
            pointNames={pointNames}
            filteredPointNames={filteredPointNames}
            pointSearch={pointSearch}
            setPointSearch={setPointSearch}
            getPluginNodeDef={getPluginNodeDef}
            canDelete={canDelete}
            onDeleteNode={handleDeleteNode}
            onClose={() => setRightPanelOpen(false)}
          />
        )}
      </div>

      <WorkflowDialogs
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editTags={editTags}
        setEditTags={setEditTags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        tagPopoverOpen={tagPopoverOpen}
        setTagPopoverOpen={setTagPopoverOpen}
        editDescription={editDescription}
        setEditDescription={setEditDescription}
        tagInputRef={tagInputRef}
        onSaveWorkflowInfo={handleSaveWorkflowInfo}
        showLeaveDialog={showLeaveDialog}
        setShowLeaveDialog={setShowLeaveDialog}
        onLeave={onBack}
        showEnvVarsDialog={showEnvVarsDialog}
        setShowEnvVarsDialog={setShowEnvVarsDialog}
        envVars={envVars}
        setEnvVars={setEnvVars}
        visibleSecrets={visibleSecrets}
        setVisibleSecrets={setVisibleSecrets}
        showSettingsDialog={showSettingsDialog}
        setShowSettingsDialog={setShowSettingsDialog}
        settings={settings}
        setSettings={setSettings}
        setIsDirty={setIsDirty}
      />
    </div>
  );
}
