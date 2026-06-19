import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

import { workflowsApi } from "@/api/workflows";
import { pointsApi } from "@/api/points";
import { nodesApi } from "@/api/nodes";
import type { WorkflowDSL, WorkflowListItem, EnvVar, ComponentCategory } from "../types";
import { dslToReactFlow, getDefaultSettings } from "../transform";
import { autoLayout } from "../layout";
import { usePluginNodes } from "./usePluginNodes";
import { useWorkflowHistory } from "./useWorkflowHistory";
import { useWorkflowPersistence } from "./useWorkflowPersistence";
import { useWorkflowKeyboard } from "./useWorkflowKeyboard";
import { DragNodePreview } from "../nodes/DragNodePreview";
import UnifiedNodeShell from "../nodes/UnifiedNodeShell";
import { PluginNodesContext } from "../nodes-context";
import { CATEGORY_LABELS } from "../constants";

// ========================================
// Hook
// ========================================

interface UseWorkflowCanvasOptions {
  workflowId: string | null;
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function useWorkflowCanvas({ workflowId, onBack, onDirtyChange }: UseWorkflowCanvasOptions) {
  // ----------------------------------------
  // ReactFlow state
  // ----------------------------------------
  const [nodes, setNodes, _onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, _onEdgesChange] = useEdgesState<Edge>([]);

  // ----------------------------------------
  // Data state
  // ----------------------------------------
  const [dsl, setDsl] = useState<WorkflowDSL | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowListItem | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [settings, setSettings] =
    useState<NonNullable<WorkflowDSL["settings"]>>(getDefaultSettings());
  const [uploadingNode, setUploadingNode] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------------------------------
  // Selection & panels
  // ----------------------------------------
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState("config");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // ----------------------------------------
  // Library state
  // ----------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // ----------------------------------------
  // Name editing
  // ----------------------------------------
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // ----------------------------------------
  // Dialogs
  // ----------------------------------------
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [showEnvVarsDialog, setShowEnvVarsDialog] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [envVarFullscreen, setEnvVarFullscreen] = useState(false);
  const [testLogFullscreen, setTestLogFullscreen] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // ----------------------------------------
  // Point names
  // ----------------------------------------
  const [pointNames, setPointNames] = useState<string[]>([]);
  const [pointSearch, setPointSearch] = useState("");

  // ----------------------------------------
  // Handle menu
  // ----------------------------------------
  const [handleMenu, setHandleMenu] = useState<{
    nodeId: string;
    handleId?: string;
    handleType: "target" | "source";
    x: number;
    y: number;
    flowX?: number;
    flowY?: number;
  } | null>(null);

  // ----------------------------------------
  // Context menu
  // ----------------------------------------
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    target: "pane" | "node";
  }>({ x: 0, y: 0, visible: false, target: "pane" });

  // ----------------------------------------
  // ReactFlow instance
  // ----------------------------------------
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // ----------------------------------------
  // Refs
  // ----------------------------------------
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const connectingRef = useRef<{
    nodeId: string;
    handleId?: string;
    handleType: "target" | "source";
  } | null>(null);
  const menuOpenedAtRef = useRef(0);
  const connectionMadeRef = useRef(false);
  const copiedNodesRef = useRef<Node[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // ----------------------------------------
  // Sub-hooks
  // ----------------------------------------
  const { pluginNodes, getNodeDef, refresh: refreshPluginNodes } = usePluginNodes();
  const {
    historyRef,
    historyIndexRef,
    skipHistoryRef,
    pushHistory: _pushHistory,
    undo,
  } = useWorkflowHistory();

  const {
    saving,
    publishing,
    testing,
    testLogOpen,
    setTestLogOpen,
    testResult,
    isDirty,
    setIsDirty,
    saveResult,
    saveMode,
    handleSave,
    handlePublish,
    handleTestRun,
    handleTestNode,
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

  // ----------------------------------------
  // Computed values
  // ----------------------------------------
  const filteredPointNames = useMemo(
    () =>
      pointSearch
        ? pointNames.filter((name) => name.toLowerCase().includes(pointSearch.toLowerCase()))
        : pointNames,
    [pointNames, pointSearch],
  );

  const workflowName =
    workflow?.name ?? dsl?.nodes?.find((n) => n.type === "start")?.name ?? "未命名工作流";
  const isPublished = workflow?.enabled ?? false;
  const selectedNodeType = selectedNode?.type as string;
  const canDelete = selectedNodeType !== "start" && selectedNodeType !== "end" && !!selectedNode;

  // ----------------------------------------
  // Node types & categories
  // ----------------------------------------
  const nodeTypes = useMemo(() => {
    const types: Record<string, React.ComponentType<any>> = {};
    for (const plugin of pluginNodes) {
      types[plugin.id] = UnifiedNodeShell;
    }
    return types;
  }, [pluginNodes]);

  const componentCategories = useMemo(() => {
    const groups = new Map<string, ComponentCategory>();

    for (const plugin of pluginNodes) {
      const catId = plugin.category;
      const label = CATEGORY_LABELS[catId] ?? catId;

      if (!groups.has(catId)) {
        groups.set(catId, { id: catId, label, items: [] });
      }
      groups.get(catId)!.items.push({
        type: plugin.id as string,
        label: plugin.name,
        description: plugin.description || "",
        iconSvg: plugin.icon,
        color: plugin.color,
      });
    }

    return Array.from(groups.values());
  }, [pluginNodes]);

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

  // ----------------------------------------
  // Callbacks
  // ----------------------------------------

  const onNodesChange = useCallback(
    (changes: Parameters<typeof _onNodesChange>[0]) => {
      const isUserChange = changes.some((c) => c.type !== "dimensions" && c.type !== "select");
      if (isUserChange) {
        setIsDirty(true);
      }
      _onNodesChange(changes);
    },
    [_onNodesChange],
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof _onEdgesChange>[0]) => {
      const isUserChange = changes.some((c) => c.type !== "select");
      if (isUserChange) {
        setIsDirty(true);
      }
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

      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return;
      }

      const flowPos = rfInstance?.screenToFlowPosition({ x: clientX, y: clientY });

      const menuWidth = 200;
      const menuHeight = 320;
      const menuOffset = handleType === "source" ? 12 : -212;
      let menuX = clientX - rect.left + menuOffset;
      let menuY = clientY - rect.top - 12;
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

      menuOpenedAtRef.current = Date.now();
    },
    [],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setRightPanelOpen(true);
    setActiveConfigTab("config");
  }, []);

  const selectNode = useCallback(
    (node: Node | null) => {
      if (node) {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
        setSelectedNode(node);
      } else {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        setSelectedNode(null);
      }
    },
    [setNodes],
  );

  const onPaneClick = useCallback(() => {
    if (Date.now() - menuOpenedAtRef.current < 150) {
      return;
    }
    setSelectedNode(null);
    setRightPanelOpen(false);
    setHandleMenu(null);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: Node[] }) => {
    setSelectedNodeIds(selectedNodes.map((n) => n.id));
  }, []);

  const onNodeDragStop = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setSelectedNode(null);
    setRightPanelOpen(false);
  }, [setNodes]);

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
      const menuHeight = 320;
      const offset = 8;
      let x: number;
      if (handleType === "source") {
        x = edgeX - rect.left + offset;
      } else {
        x = edgeX - rect.left - menuWidth - offset;
      }
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
              <DragNodePreview
                type={type}
                data={nodeData}
                color={item?.color}
                iconSvg={item?.icon}
              />
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

      const def = getNodeDef(type);
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
    [rfInstance, setNodes, pluginNodes, getNodeDef, _pushHistory, edges],
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

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    copiedNodesRef.current = [node];
    toast.success("已复制到剪贴板");
  }, []);

  const handleAutoLayout = useCallback(() => {
    _pushHistory(nodesRef.current, edges);
    setNodes((nds) => autoLayout(nds, edges));
    setIsDirty(true);
    requestAnimationFrame(() => {
      rfInstance?.fitView({ padding: 0.2 });
    });
  }, [edges, setNodes, rfInstance, _pushHistory]);

  const handleUploadNode = useCallback(
    async (file: File) => {
      setUploadingNode(true);
      try {
        await nodesApi.install(file);
        await refreshPluginNodes();
        toast.success(`节点 ${file.name} 安装成功`);
      } catch (err) {
        toast.error(`安装失败: ${err instanceof Error ? err.message : "未知错误"}`);
      } finally {
        setUploadingNode(false);
      }
    },
    [refreshPluginNodes],
  );

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
    setEditTags([]);
    setEditDescription(workflow?.description ?? "");
    setTagInput("");
    setShowEditDialog(true);
  }, [workflow, workflowName]);

  const handleSaveWorkflowInfo = useCallback(async () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    if (workflowId && dsl) {
      try {
        await workflowsApi.update(workflowId, {
          name: trimmed,
          description: editDescription.trim() || undefined,
          dsl,
        });
      } catch {
        // silently fail
      }
    }

    setWorkflow((prev) =>
      prev ? { ...prev, name: trimmed, description: editDescription.trim() || null } : prev,
    );
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

  // ----------------------------------------
  // Memoized nodes with callbacks
  // ----------------------------------------
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onAddNodeFromHandle: handleAddNodeFromHandle },
      })),
    [nodes, handleAddNodeFromHandle],
  );

  // ----------------------------------------
  // Effects
  // ----------------------------------------

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

  // Load workflow data
  useEffect(() => {
    if (!workflowId) {
      const defaultDsl: WorkflowDSL = {
        version: "1.0",
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
        const needsLayout = loadedDsl.nodes.some((node) => !node.position);
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
    // NOTE: intentionally omit setNodes/setEdges from deps —
    // React Flow v12 setters are not stable references.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  // Load point names for dropdown
  useEffect(() => {
    pointsApi
      .list()
      .then((points) => {
        setPointNames(points.map((p) => p.name).filter((n): n is string => !!n));
      })
      .catch(() => {
        // silently fail
      });
  }, []);

  // Report dirty state to parent
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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

  // ----------------------------------------
  // Keyboard shortcuts
  // ----------------------------------------
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

  // ----------------------------------------
  // Return
  // ----------------------------------------
  return {
    // ReactFlow
    nodes,
    edges,
    setNodes,
    setEdges,
    rfInstance,
    setRfInstance,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeClick,
    onPaneClick,
    onSelectionChange,
    onNodeDragStop,
    onDragOver,
    onDrop,
    onDragEnd,
    nodeTypes,
    nodesWithCallbacks,

    // Data
    dsl,
    workflow,
    envVars,
    setEnvVars,
    settings,
    setSettings,
    loading,
    uploadingNode,
    pluginNodes,
    getNodeDef,

    // Selection & panels
    selectedNode,
    setSelectedNode,
    selectNode,
    rightPanelOpen,
    setRightPanelOpen,
    activeConfigTab,
    setActiveConfigTab,
    selectedNodeIds,
    setSelectedNodeIds,

    // Library
    searchQuery,
    setSearchQuery,
    libraryOpen,
    setLibraryOpen,
    collapsedCategories,
    setCollapsedCategories,
    filteredCategories,
    componentCategories,

    // Name editing
    editingName,
    editedName,
    setEditedName,
    handleNameClick,
    handleNameCommit,
    handleNameCancel,
    handleNameKeyDown,
    workflowName,
    isPublished,

    // Dialogs
    showLeaveDialog,
    setShowLeaveDialog,
    showEditDialog,
    setShowEditDialog,
    editTitle,
    setEditTitle,
    editTags,
    setEditTags,
    tagInput,
    setTagInput,
    tagPopoverOpen,
    setTagPopoverOpen,
    editDescription,
    setEditDescription,
    showEnvVarsDialog,
    setShowEnvVarsDialog,
    visibleSecrets,
    setVisibleSecrets,
    envVarFullscreen,
    setEnvVarFullscreen,
    testLogFullscreen,
    setTestLogFullscreen,
    showSettingsDialog,
    setShowSettingsDialog,
    tagInputRef,
    handleOpenEditDialog,
    handleSaveWorkflowInfo,
    handleBack,

    // Points
    pointNames,
    pointSearch,
    setPointSearch,
    filteredPointNames,

    // Handle menu
    handleMenu,
    setHandleMenu,
    handleSelectNodeFromMenu,

    // Context menu
    contextMenu,
    setContextMenu,

    // Node operations
    handleDeleteNode,
    handleDuplicateNode,
    handleAutoLayout,
    handleUploadNode,
    updateNodeData,
    canDelete,
    selectedNodeType,

    // Drag
    handleDragStart,

    // Persistence
    saving,
    publishing,
    testing,
    testLogOpen,
    setTestLogOpen,
    testResult,
    isDirty,
    setIsDirty,
    saveResult,
    saveMode,
    handleSave,
    handlePublish,
    handleTestRun,
    handleTestNode,

    // History
    _pushHistory,
    undo,

    // Refs
    reactFlowWrapper,
    nodesRef,
    copiedNodesRef,
    historyRef,
    historyIndexRef,
    connectionMadeRef,
    menuOpenedAtRef,
  };
}
