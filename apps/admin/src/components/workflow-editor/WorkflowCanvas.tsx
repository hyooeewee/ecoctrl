import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  LayoutTemplate,
  Copy,
  Trash2,
  Undo2,
  Braces,
  PanelLeft,
  PanelBottom,
  PanelRight,
  Expand,
  Shrink,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

import { PluginNodesContext } from "./nodes-context";
import { useColorMode } from "@/hooks/useColorMode";
import { useAppStore } from "@/store/appStore";
import { useWorkflowCanvas } from "./hooks/useWorkflowCanvas";

import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowLibrary } from "./WorkflowLibrary";
import { WorkflowTestPanel } from "./WorkflowTestPanel";
import { WorkflowNodeConfig } from "./WorkflowNodeConfig";
import { WorkflowDialogs } from "./WorkflowDialogs";
import { VariableEditor } from "./VariableEditor";

interface WorkflowCanvasProps {
  workflowId: string | null;
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function WorkflowCanvas({ workflowId, onBack, onDirtyChange }: WorkflowCanvasProps) {
  const canvas = useWorkflowCanvas({ workflowId, onBack, onDirtyChange });

  const theme = useAppStore((s) => s.preferencesOverride.theme ?? "system");
  const colorMode = useColorMode(theme);
  const setLogViewerData = useAppStore((state) => state.setLogViewerData);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  // Navigate to LogViewerPage when test log fullscreen is requested
  useEffect(() => {
    if (canvas.testLogFullscreen && canvas.testResult && workflowId) {
      const nodeLogs = canvas.testResult.nodeLogs?.map((log) => ({
        nodeId: log.nodeId,
        nodeName: log.nodeName,
        nodeType: log.nodeType,
        status: log.status,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        durationMs: log.durationMs,
        output: log.output,
        error: log.error,
      }));
      setLogViewerData({
        type: "test",
        workflowId,
        testResult: {
          status: canvas.testResult.status,
          error: canvas.testResult.error,
          nodeLogs,
        },
        returnTab: "workflowCanvas",
      });
      setActiveTab("logViewer");
      canvas.setTestLogFullscreen(false);
    }
  }, [canvas.testLogFullscreen, canvas.testResult, workflowId, setLogViewerData, setActiveTab]);

  if (canvas.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {!canvas.envVarFullscreen && !canvas.testLogFullscreen && (
        <WorkflowToolbar
          workflowName={canvas.workflowName}
          isPublished={canvas.isPublished}
          isDirty={canvas.isDirty}
          editingName={canvas.editingName}
          editedName={canvas.editedName}
          saving={canvas.saving}
          publishing={canvas.publishing}
          testing={canvas.testing}
          saveResult={canvas.saveResult}
          saveMode={canvas.saveMode}
          workflowId={workflowId}
          onBack={canvas.handleBack}
          onNameClick={canvas.handleNameClick}
          onNameCommit={canvas.handleNameCommit}
          onNameCancel={canvas.handleNameCancel}
          onNameChange={canvas.setEditedName}
          onNameKeyDown={canvas.handleNameKeyDown}
          onEditDialog={canvas.handleOpenEditDialog}
          onTestRun={canvas.handleTestRun}
          onSave={canvas.handleSave}
          onPublish={canvas.handlePublish}
          onEnvVars={() => canvas.setShowEnvVarsDialog(true)}
          onSettings={() => canvas.setShowSettingsDialog(true)}
        />
      )}

      {canvas.envVarFullscreen ? (
        <VariableEditor
          items={canvas.envVars}
          setItems={canvas.setEnvVars}
          visibleSecrets={canvas.visibleSecrets}
          setVisibleSecrets={canvas.setVisibleSecrets}
          setIsDirty={canvas.setIsDirty}
          onClose={() => {
            canvas.setEnvVarFullscreen(false);
            canvas.setShowEnvVarsDialog(true);
          }}
          onExitFullscreen={() => {
            canvas.setEnvVarFullscreen(false);
            canvas.setShowEnvVarsDialog(true);
          }}
          fullscreen={true}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <WorkflowLibrary
            libraryOpen={canvas.libraryOpen}
            searchQuery={canvas.searchQuery}
            collapsedCategories={canvas.collapsedCategories}
            filteredCategories={canvas.filteredCategories}
            onSearchChange={canvas.setSearchQuery}
            onCategoryToggle={(id) =>
              canvas.setCollapsedCategories((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onDragStart={canvas.handleDragStart}
            onDragEnd={canvas.onDragEnd}
            onUpload={canvas.handleUploadNode}
            uploading={canvas.uploadingNode}
          />

          {/* Canvas */}
          <div
            ref={canvas.reactFlowWrapper}
            className="workflow-editor-canvas relative flex flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950"
          >
            <div className="flex-1 overflow-hidden">
              <PluginNodesContext.Provider value={canvas.pluginNodes}>
                <ReactFlow
                  colorMode={colorMode}
                  nodes={canvas.nodesWithCallbacks}
                  edges={canvas.edges}
                  onNodesChange={canvas.onNodesChange}
                  onEdgesChange={canvas.onEdgesChange}
                  onConnect={canvas.onConnect}
                  onConnectStart={canvas.onConnectStart}
                  onConnectEnd={canvas.onConnectEnd}
                  onNodeClick={canvas.onNodeClick}
                  onPaneClick={canvas.onPaneClick}
                  onNodeDragStop={canvas.onNodeDragStop}
                  onDragOver={canvas.onDragOver}
                  onDrop={canvas.onDrop}
                  onDragEnd={canvas.onDragEnd}
                  onInit={canvas.setRfInstance}
                  nodeTypes={canvas.nodeTypes}
                  onSelectionChange={canvas.onSelectionChange}
                  onPaneContextMenu={(e) => {
                    e.preventDefault();
                    const wrapper = canvas.reactFlowWrapper.current;
                    if (!wrapper) return;
                    const rect = wrapper.getBoundingClientRect();
                    canvas.setContextMenu({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      visible: true,
                      target: "pane",
                    });
                  }}
                  onNodeContextMenu={(e, node) => {
                    e.preventDefault();
                    const wrapper = canvas.reactFlowWrapper.current;
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
                    canvas.setContextMenu({ x, y, visible: true, target: "node" });
                  }}
                  selectionOnDrag
                  panOnDrag={[1, 2]}
                  panOnScroll
                  fitView
                  attributionPosition="bottom-right"
                  deleteKeyCode={["Backspace", "Delete"]}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                  <Controls>
                    <ControlButton onClick={canvas.handleAutoLayout} title="自动布局">
                      <LayoutTemplate size={16} />
                    </ControlButton>
                  </Controls>
                  <MiniMap nodeStrokeWidth={3} zoomable pannable />
                </ReactFlow>
              </PluginNodesContext.Provider>

              {/* Context menu */}
              {canvas.contextMenu.visible && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => canvas.setContextMenu((prev) => ({ ...prev, visible: false }))}
                  />
                  <div
                    className="absolute z-50 w-52 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
                    style={{ left: canvas.contextMenu.x, top: canvas.contextMenu.y }}
                  >
                    {canvas.contextMenu.target === "node" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const selected = canvas.nodesRef.current.filter((n) =>
                              canvas.selectedNodeIds.includes(n.id),
                            );
                            if (selected.length > 0) {
                              canvas.copiedNodesRef.current = selected;
                              toast.success(`已复制 ${selected.length} 个节点`);
                            }
                            canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                          }}
                          className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground"
                        >
                          <Copy size={14} />
                          <span className="flex-1 text-left">复制</span>
                          <span className="flex items-center gap-0.5">
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                              Ctrl
                            </span>
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                              C
                            </span>
                          </span>
                        </button>
                        <div className="my-1 h-px bg-border" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const copied = canvas.copiedNodesRef.current;
                        if (copied.length === 0) {
                          canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                          return;
                        }
                        const idMap = new Map<string, string>();
                        const newNodes = copied.map((n) => {
                          const newId = `${n.type.replace(/-/g, "_")}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                          idMap.set(n.id, newId);
                          return {
                            ...n,
                            id: newId,
                            position: { x: n.position.x + 30, y: n.position.y + 30 },
                            selected: false,
                          };
                        });
                        const newEdges = canvas.edges
                          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
                          .map((edge) => ({
                            ...edge,
                            id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}-${Date.now()}`,
                            source: idMap.get(edge.source)!,
                            target: idMap.get(edge.target)!,
                          }));
                        canvas.setIsDirty(true);
                        canvas._pushHistory(canvas.nodesRef.current, canvas.edges);
                        canvas.setNodes((nds) => [...nds, ...newNodes]);
                        if (newEdges.length > 0) canvas.setEdges((eds) => [...eds, ...newEdges]);
                        toast.success(`已粘贴 ${copied.length} 个节点`);
                        canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                      className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <Braces size={14} />
                      <span className="flex-1 text-left">粘贴</span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          Ctrl
                        </span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          V
                        </span>
                      </span>
                    </button>
                    {canvas.contextMenu.target === "node" && canvas.selectedNodeIds.length > 0 && (
                      <>
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          onClick={() => {
                            canvas.setIsDirty(true);
                            canvas._pushHistory(canvas.nodesRef.current, canvas.edges);
                            canvas.setNodes((nds) =>
                              nds.filter((n) => !canvas.selectedNodeIds.includes(n.id)),
                            );
                            canvas.setEdges((eds) =>
                              eds.filter(
                                (e) =>
                                  !canvas.selectedNodeIds.includes(e.source) &&
                                  !canvas.selectedNodeIds.includes(e.target),
                              ),
                            );
                            canvas.setSelectedNodeIds([]);
                            canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                          }}
                          className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-rose-600 outline-none transition-colors select-none hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 size={14} />
                          <span className="flex-1 text-left">删除</span>
                          <span className="flex items-center gap-0.5">
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                              Del
                            </span>
                          </span>
                        </button>
                      </>
                    )}
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = canvas.nodesRef.current.map((n) => n.id);
                        canvas.setSelectedNodeIds(allIds);
                        canvas.setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
                        canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                      className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground"
                    >
                      <Copy size={14} />
                      <span className="flex-1 text-left">全选</span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          Ctrl
                        </span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          A
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={canvas.historyIndexRef.current <= 0}
                      onClick={() => {
                        canvas.undo(canvas.setNodes, canvas.setEdges, () => {
                          canvas.setSelectedNodeIds([]);
                          toast.success("已撤销");
                        });
                        canvas.setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                      className="flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors select-none hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Undo2 size={14} />
                      <span className="flex-1 text-left">撤销</span>
                      <span className="flex items-center gap-0.5">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          Ctrl
                        </span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 text-[10px]">
                          Z
                        </span>
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* Handle click node picker popup */}
              {canvas.handleMenu && (
                <div
                  className="absolute z-50 w-[200px] overflow-hidden rounded-lg border bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                  style={{ left: canvas.handleMenu.x, top: canvas.handleMenu.y }}
                >
                  <div className="border-b px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {canvas.handleMenu.handleType === "source"
                        ? "选择下一步节点"
                        : "选择上一步节点"}
                    </span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {(() => {
                      const isSource = canvas.handleMenu.handleType === "source";
                      const currentNodeIsStart =
                        canvas.nodes.find((n) => n.id === canvas.handleMenu!.nodeId)?.type ===
                        "start";
                      return canvas.componentCategories.map((cat) => {
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
                            {items.map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => canvas.handleSelectNodeFromMenu(item.type)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <div
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                                  style={{
                                    backgroundColor: (item.color ?? "#94a3b8") + "26",
                                    color: item.color ?? "#94a3b8",
                                  }}
                                >
                                  {item.iconSvg ? (
                                    <div
                                      dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                                      className="flex h-3.5 w-3.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                                    />
                                  ) : (
                                    <LayoutTemplate size={10} />
                                  )}
                                </div>
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Panel toggle buttons */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border bg-white/90 p-1 shadow-sm backdrop-blur-sm dark:bg-zinc-900/90 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => canvas.setLibraryOpen((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${canvas.libraryOpen ? "bg-zinc-100 text-foreground dark:bg-zinc-800" : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"}`}
                title={canvas.libraryOpen ? "隐藏节点库" : "显示节点库"}
              >
                <PanelLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => canvas.setTestLogOpen((v) => !v)}
                disabled={!canvas.testResult}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${!canvas.testResult ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700" : canvas.testLogOpen ? "bg-zinc-100 text-foreground dark:bg-zinc-800" : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"}`}
                title={canvas.testLogOpen ? "隐藏日志" : "显示日志"}
              >
                <PanelBottom size={16} />
              </button>
              <button
                type="button"
                onClick={() => canvas.setRightPanelOpen((v) => !v)}
                disabled={!canvas.selectedNode}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${!canvas.selectedNode ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700" : canvas.rightPanelOpen ? "bg-zinc-100 text-foreground dark:bg-zinc-800" : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"}`}
                title={canvas.rightPanelOpen ? "隐藏配置面板" : "显示配置面板"}
              >
                <PanelRight size={16} />
              </button>
              {(() => {
                const hasClosed =
                  !canvas.libraryOpen ||
                  (canvas.testResult && !canvas.testLogOpen) ||
                  (canvas.selectedNode && !canvas.rightPanelOpen);
                return (
                  <>
                    <div className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
                    <button
                      type="button"
                      onClick={() => {
                        if (hasClosed) {
                          canvas.setLibraryOpen(true);
                          if (canvas.testResult) canvas.setTestLogOpen(true);
                          if (canvas.selectedNode) canvas.setRightPanelOpen(true);
                        } else {
                          canvas.setLibraryOpen(false);
                          canvas.setTestLogOpen(false);
                          canvas.setRightPanelOpen(false);
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"
                      title={hasClosed ? "展开全部面板" : "收起全部面板"}
                    >
                      {hasClosed ? <Expand size={14} /> : <Shrink size={14} />}
                    </button>
                  </>
                );
              })()}
            </div>

            <WorkflowTestPanel
              testResult={canvas.testResult}
              testLogOpen={canvas.testLogOpen}
              onToggle={() => canvas.setTestLogOpen((v) => !v)}
              onFullscreen={() => canvas.setTestLogFullscreen(true)}
            />
          </div>

          {canvas.selectedNode && canvas.rightPanelOpen && (
            <WorkflowNodeConfig
              selectedNode={canvas.selectedNode}
              selectedNodeType={canvas.selectedNodeType}
              activeConfigTab={canvas.activeConfigTab}
              onTabChange={canvas.setActiveConfigTab}
              updateNodeData={canvas.updateNodeData}
              pointNames={canvas.pointNames}
              filteredPointNames={canvas.filteredPointNames}
              pointSearch={canvas.pointSearch}
              setPointSearch={canvas.setPointSearch}
              getNodeDef={canvas.getNodeDef}
              canDelete={canvas.canDelete}
              onDeleteNode={canvas.handleDeleteNode}
              onDuplicateNode={canvas.handleDuplicateNode}
              onTestNode={canvas.handleTestNode}
              onClose={() => canvas.setRightPanelOpen(false)}
              onSelectNode={(node) => {
                canvas.selectNode(node);
                canvas.setRightPanelOpen(true);
                requestAnimationFrame(() => {
                  canvas.rfInstance?.fitView({
                    nodes: [{ id: node.id }],
                    padding: 0.3,
                    duration: 400,
                  });
                });
              }}
              nodes={canvas.nodes}
              edges={canvas.edges}
              envVars={canvas.envVars}
              testResult={canvas.testResult}
            />
          )}
        </div>
      )}

      <WorkflowDialogs
        showEditDialog={canvas.showEditDialog}
        setShowEditDialog={canvas.setShowEditDialog}
        editTitle={canvas.editTitle}
        setEditTitle={canvas.setEditTitle}
        editTags={canvas.editTags}
        setEditTags={canvas.setEditTags}
        tagInput={canvas.tagInput}
        setTagInput={canvas.setTagInput}
        tagPopoverOpen={canvas.tagPopoverOpen}
        setTagPopoverOpen={canvas.setTagPopoverOpen}
        editDescription={canvas.editDescription}
        setEditDescription={canvas.setEditDescription}
        tagInputRef={canvas.tagInputRef}
        onSaveWorkflowInfo={canvas.handleSaveWorkflowInfo}
        showLeaveDialog={canvas.showLeaveDialog}
        setShowLeaveDialog={canvas.setShowLeaveDialog}
        onLeave={onBack}
        showEnvVarsDialog={canvas.showEnvVarsDialog}
        setShowEnvVarsDialog={canvas.setShowEnvVarsDialog}
        envVars={canvas.envVars}
        setEnvVars={canvas.setEnvVars}
        visibleSecrets={canvas.visibleSecrets}
        setVisibleSecrets={canvas.setVisibleSecrets}
        envVarFullscreen={canvas.envVarFullscreen}
        setEnvVarFullscreen={canvas.setEnvVarFullscreen}
        showSettingsDialog={canvas.showSettingsDialog}
        setShowSettingsDialog={canvas.setShowSettingsDialog}
        settings={canvas.settings}
        setSettings={canvas.setSettings}
        setIsDirty={canvas.setIsDirty}
      />
    </div>
  );
}
