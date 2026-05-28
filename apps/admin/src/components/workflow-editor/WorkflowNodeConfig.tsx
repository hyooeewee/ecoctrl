import { X, Trash2, AlertTriangle, Play, Copy, Check, LayoutTemplate } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { ExpressionRefHelper, type UpstreamNodeInfo } from "./NodeConfigPanel";
import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Label } from "@ecoctrl/ui/label";
import { Tabs, TabsContent } from "@ecoctrl/ui/tabs";
import { ScrollArea } from "@ecoctrl/ui/scroll-area";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@ecoctrl/ui/combobox";
import type { Node, Edge } from "@xyflow/react";
import { NodeConfigPanel } from "./NodeConfigPanel";
import type { NodeDefinition } from "@/api/nodes";
import type { EnvVar } from "./types";

interface NodeLogEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
}

function CopyErrorButton({ error }: { error: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(error).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [error]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-red-400 transition-colors hover:text-red-600"
    >
      {copied ? (
        <>
          <Check size={10} />
          <span>已复制</span>
        </>
      ) : (
        <>
          <Copy size={10} />
          <span>复制</span>
        </>
      )}
    </button>
  );
}

interface WorkflowNodeConfigProps {
  selectedNode: Node;
  selectedNodeType: string;
  activeConfigTab: string;
  onTabChange: (v: string) => void;
  updateNodeData: (nodeId: string, updates: Partial<Node["data"]>) => void;
  pointNames: string[];
  filteredPointNames: string[];
  pointSearch: string;
  setPointSearch: (v: string) => void;
  getNodeDef: (type: string) => NodeDefinition | null;
  canDelete: boolean;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onTestNode?: (nodeId: string) => void;
  onClose: () => void;
  onSelectNode?: (node: Node) => void;
  nodes: Node[];
  edges: Edge[];
  envVars?: EnvVar[];
  testResult?: {
    status: string;
    error?: string;
    nodeLogs: NodeLogEntry[];
  } | null;
}

export function WorkflowNodeConfig({
  selectedNode,
  selectedNodeType,
  activeConfigTab,
  onTabChange,
  updateNodeData,
  pointNames,
  filteredPointNames,
  pointSearch,
  setPointSearch,
  getNodeDef,
  canDelete,
  onDeleteNode,
  onDuplicateNode,
  onTestNode,
  onClose,
  onSelectNode,
  nodes,
  edges,
  envVars,
  testResult,
}: WorkflowNodeConfigProps) {
  const config = (selectedNode.data.config as Record<string, unknown>) ?? {};
  const nodeDef = getNodeDef(selectedNodeType);
  const schemaProperties = (nodeDef?.schema as Record<string, unknown>)?.properties as
    | Record<string, unknown>
    | undefined;
  const isPointNode = !!schemaProperties && "pointName" in schemaProperties;
  const nodeColor = nodeDef?.color ?? "#94a3b8";

  const [copied, setCopied] = useState(false);
  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(selectedNode.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [selectedNode.id]);

  // Inline title editing in header
  const [editingTitle, setEditingTitle] = useState(false);
  const handleTitleClick = useCallback(() => {
    setEditingTitle(true);
  }, []);
  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false);
  }, []);
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setEditingTitle(false);
    }
  }, []);

  // Resizable panel width
  const [panelWidth, setPanelWidth] = useState(320);
  const isDraggingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const next = Math.min(600, Math.max(260, startWidth + delta));
        setPanelWidth(next);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [panelWidth],
  );

  // Resolve ALL ancestor nodes (recursive) for expression references
  function getAllAncestors(nodeId: string, edges: Edge[], nodes: Node[]): Node[] {
    const revAdj = new Map<string, string[]>();
    for (const e of edges) {
      if (!revAdj.has(e.target)) revAdj.set(e.target, []);
      revAdj.get(e.target)!.push(e.source);
    }

    const ancestorIds = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const sourceId of revAdj.get(current) ?? []) {
        if (!ancestorIds.has(sourceId)) {
          ancestorIds.add(sourceId);
          queue.push(sourceId);
        }
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return Array.from(ancestorIds)
      .map((id) => nodeMap.get(id))
      .filter((n): n is Node => !!n);
  }

  const upstreamNodes = getAllAncestors(selectedNode.id, edges, nodes);

  // Resolve upstream node info for expression reference helper
  const resolvedUpstream: UpstreamNodeInfo[] = upstreamNodes.map((node) => {
    const nodeType = (node.data.type as string) || "";
    const nodeLabel = (node.data.label as string) || node.id;
    const def = getNodeDef(nodeType);
    const outputSchema = (def?.schema as Record<string, unknown>)?.outputs as
      | { properties?: Record<string, unknown> }
      | undefined;
    const outputKeys = outputSchema?.properties ? Object.keys(outputSchema.properties) : ["value"];
    return {
      id: node.id,
      label: nodeLabel,
      outputKeys,
      outputProperties: outputSchema?.properties,
    };
  });

  const envVarsForHelper = (envVars ?? []).map((v) => ({ key: v.key, type: v.type }));

  const insertExprToPointName = useCallback(
    (expr: string) => {
      const current = (config?.pointName as string) ?? "";
      const next = current ? `${current}${expr}` : expr;
      updateNodeData(selectedNode.id, {
        config: { ...config, pointName: next },
      });
    },
    [config, selectedNode.id, updateNodeData],
  );

  // Resolve direct parent and child nodes from edge connections
  const parentNodes = edges
    .filter((e) => e.target === selectedNode.id)
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter((n): n is Node => !!n);

  const childNodes = edges
    .filter((e) => e.source === selectedNode.id)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is Node => !!n);

  return (
    <div
      className="relative flex shrink-0 flex-col border-l bg-white dark:bg-zinc-900"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute -left-1.5 top-0 bottom-0 z-50 w-3 cursor-col-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-primary/40" />
      </div>
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] items-center gap-x-3 border-b px-4 py-3">
        {/* Left: Logo — spans both rows */}
        <div className="row-span-2 flex items-center justify-center">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: nodeColor }}
          >
            {nodeDef?.icon ? (
              <div
                dangerouslySetInnerHTML={{ __html: nodeDef.icon }}
                className="flex h-3.5 w-3.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
              />
            ) : (
              ((selectedNode.data.label as string)?.charAt(0)?.toUpperCase() ?? "N")
            )}
          </span>
        </div>

        {/* Center-top: Node Name (editable) */}
        <div className="flex min-w-0 flex-col">
          {editingTitle ? (
            <Input
              value={(selectedNode.data.label as string) ?? ""}
              autoFocus
              onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="h-7 border-0 bg-transparent px-1.5 py-0 text-sm font-semibold focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          ) : (
            <span
              className="truncate text-sm font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={handleTitleClick}
              title="点击编辑"
            >
              {(selectedNode.data.label as string) ?? selectedNode.type}
            </span>
          )}
        </div>

        {/* Right-top: Controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title="测试运行"
            onClick={() => onTestNode?.(selectedNode.id)}
          >
            <Play size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title="复制"
            onClick={() => onDuplicateNode(selectedNode.id)}
          >
            <Copy size={13} />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-500"
              title="删除"
              onClick={() => onDeleteNode(selectedNode.id)}
            >
              <Trash2 size={13} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Bottom: ID — spans center + right columns */}
        <div className="col-span-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>ID:</span>
          <span className="font-mono">{selectedNode.id}</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="flex items-center justify-center transition-colors hover:text-foreground"
            title="复制节点 ID"
          >
            {copied ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeConfigTab} onValueChange={onTabChange} className="flex flex-1 flex-col">
        <div className="mx-4 mt-3 flex gap-6 border-b border-border/50">
          <button
            onClick={() => onTabChange("config")}
            className={`pb-2 text-sm transition-colors ${
              activeConfigTab === "config"
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            配置
          </button>
          <button
            onClick={() => onTabChange("history")}
            className={`pb-2 text-sm transition-colors ${
              activeConfigTab === "history"
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            历史
          </button>
          <button
            onClick={() => onTabChange("related")}
            className={`pb-2 text-sm transition-colors ${
              activeConfigTab === "related"
                ? "border-b-2 border-primary font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            关联
          </button>
        </div>

        <TabsContent value="config" className="mt-0 flex-1">
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-6 px-4 py-5">
              {/* Point nodes - special combobox for point names */}
              {isPointNode && (
                <div className="space-y-1.5 group/input">
                  <Label className="flex items-center gap-2 text-sm text-foreground">
                    测点名称
                    {(() => {
                      const name = (config?.pointName as string) ?? "";
                      return name && !pointNames.includes(name) ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/60">
                          <AlertTriangle size={10} />
                          未找到
                        </span>
                      ) : null;
                    })()}
                  </Label>
                  <Combobox
                    value={(config?.pointName as string) || null}
                    inputValue={(config?.pointName as string) || ""}
                    onValueChange={(value, eventDetails) => {
                      if (
                        eventDetails.reason === "item-press" ||
                        eventDetails.reason === "clear-press"
                      ) {
                        updateNodeData(selectedNode.id, {
                          config: { ...config, pointName: value || "" },
                        });
                      }
                    }}
                    onInputValueChange={(value, eventDetails) => {
                      if (eventDetails.reason === "input-change") {
                        setPointSearch(value);
                        updateNodeData(selectedNode.id, {
                          config: { ...config, pointName: value },
                        });
                      }
                    }}
                  >
                    <ComboboxInput
                      className="h-9 w-full border-0 bg-zinc-50 has-[[data-slot=input-group-control]:focus-visible]:bg-white has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-[[data-slot=input-group-control]:focus-visible]:ring-primary/50 dark:bg-zinc-800/60 dark:has-[[data-slot=input-group-control]:focus-visible]:bg-zinc-800"
                      showTrigger
                      showClear
                    >
                      <ExpressionRefHelper
                        upstreamNodes={resolvedUpstream}
                        envVars={envVarsForHelper}
                        onSelect={insertExprToPointName}
                        triggerClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground transition-colors"
                      />
                    </ComboboxInput>
                    <ComboboxContent>
                      <ComboboxList>
                        {filteredPointNames.map((name) => (
                          <ComboboxItem key={name} value={name}>
                            {name}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              )}

              {/* Schema-driven config panel */}
              {nodeDef && (
                <NodeConfigPanel
                  nodeId={selectedNode.id}
                  nodeName={(selectedNode.data.label as string) ?? selectedNode.id}
                  nodeType={selectedNodeType}
                  currentConfig={config}
                  schema={nodeDef.schema ?? {}}
                  skipFields={isPointNode ? ["pointName"] : undefined}
                  upstreamNodes={upstreamNodes}
                  envVars={envVars}
                  getNodeDef={getNodeDef}
                  onChange={(newConfig) =>
                    updateNodeData(selectedNode.id, {
                      config: { ...config, ...newConfig },
                    })
                  }
                />
              )}

              {/* Fallback for nodes without schema */}
              {!nodeDef && !isPointNode && (
                <div className="py-4">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    该节点类型暂无配置项。
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="mt-0 flex-1">
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-4 space-y-3">
              {!testResult?.nodeLogs || testResult.nodeLogs.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2">
                  <div className="text-muted-foreground text-sm">暂无执行历史</div>
                  <div className="text-muted-foreground text-xs">
                    点击工具栏的调试按钮运行工作流后查看
                  </div>
                </div>
              ) : (
                testResult.nodeLogs
                  .filter((log) => log.nodeId === selectedNode.id)
                  .map((log) => (
                    <div key={log.nodeId} className="rounded border bg-card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            log.status === "completed"
                              ? "bg-green-500"
                              : log.status === "failed"
                                ? "bg-red-500"
                                : log.status === "running"
                                  ? "bg-amber-500"
                                  : "bg-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium">{log.nodeName}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {log.durationMs !== undefined ? `${log.durationMs}ms` : "--"}
                        </span>
                      </div>
                      {log.error && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-red-600">错误</span>
                            <CopyErrorButton error={log.error} />
                          </div>
                          <div className="rounded bg-red-50 p-2 text-[11px] text-red-700 whitespace-pre-wrap">
                            {log.error}
                          </div>
                        </div>
                      )}
                      {log.output && Object.keys(log.output).length > 0 && (
                        <pre className="font-mono text-[10px] bg-muted p-2 rounded overflow-auto max-h-48">
                          <code>{JSON.stringify(log.output, null, 2)}</code>
                        </pre>
                      )}
                    </div>
                  ))
              )}
              {testResult?.nodeLogs &&
                testResult.nodeLogs.filter((log) => log.nodeId === selectedNode.id).length === 0 &&
                testResult.nodeLogs.length > 0 && (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <div className="text-muted-foreground text-sm">该节点在本次调试中未执行</div>
                  </div>
                )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="related" className="mt-0 flex-1">
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-5 px-4 py-5">
              {/* Upstream */}
              {parentNodes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">上游节点</div>
                  <div className="flex flex-col gap-1.5">
                    {parentNodes.map((node) => (
                      <RelatedNodeCard
                        key={node.id}
                        node={node}
                        getNodeDef={getNodeDef}
                        onClick={() => onSelectNode?.(node)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {parentNodes.length > 0 && childNodes.length > 0 && (
                <div className="border-t border-dashed border-border/60" />
              )}

              {/* Downstream */}
              {childNodes.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">下游节点</div>
                  <div className="flex flex-col gap-1.5">
                    {childNodes.map((node) => (
                      <RelatedNodeCard
                        key={node.id}
                        node={node}
                        getNodeDef={getNodeDef}
                        onClick={() => onSelectNode?.(node)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {parentNodes.length === 0 && childNodes.length === 0 && (
                <p className="text-sm text-muted-foreground">无关联节点</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================================
// Related Node Card (used in "关联" tab)
// ========================================

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  return `#${clean}${alpha.toString(16).padStart(2, "0")}`;
}

function RelatedNodeCard({
  node,
  getNodeDef,
  onClick,
}: {
  node: Node;
  getNodeDef?: (type: string) => NodeDefinition | null;
  onClick: () => void;
}) {
  const nodeType = (node.data.type as string) || "";
  const nodeLabel = (node.data.label as string) || node.type || "未知";
  const def = getNodeDef?.(nodeType);
  const color = def?.color ?? "#94a3b8";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
      title={`${nodeLabel} (${node.id})`}
    >
      {/* Node icon badge */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: hexWithAlpha(color, 0x20), color }}
      >
        {def?.icon ? (
          <div
            dangerouslySetInnerHTML={{ __html: def.icon }}
            className="flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          />
        ) : (
          <LayoutTemplate size={16} />
        )}
      </span>

      {/* Node label */}
      <span className="truncate text-sm font-medium">{nodeLabel}</span>
    </button>
  );
}
