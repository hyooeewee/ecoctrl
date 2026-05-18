import { X, Trash2, AlertTriangle } from "lucide-react";
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
import type { Node } from "@xyflow/react";
import { NodeConfigPanel } from "./NodeConfigPanel";
import type { NodeDefinition } from "@/api/nodes";

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
  getPluginNodeDef: (type: string) => NodeDefinition | null;
  canDelete: boolean;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
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
  getPluginNodeDef,
  canDelete,
  onDeleteNode,
  onClose,
}: WorkflowNodeConfigProps) {
  const config = (selectedNode.data.config as Record<string, unknown>) ?? {};

  return (
    <div className="flex w-[320px] flex-col border-l bg-white dark:bg-zinc-900">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-semibold">
            {(selectedNode.data.label as string) ?? selectedNode.type}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X size={14} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeConfigTab} onValueChange={onTabChange} className="flex flex-1 flex-col">
        <div className="mx-4 mt-3 flex gap-6 border-b">
          <button
            onClick={() => onTabChange("config")}
            className={`pb-2 text-sm font-medium transition-colors ${
              activeConfigTab === "config"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Config
          </button>
          <button
            onClick={() => onTabChange("history")}
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
                    value={(config?.expression as string) ?? ""}
                    placeholder="e.g. temperature > 30"
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        config: { ...config, expression: e.target.value },
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
                      value={(config?.method as string) ?? "GET"}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, method: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">URL</Label>
                    <Input
                      value={(config?.url as string) ?? ""}
                      placeholder="https://api.example.com/..."
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, url: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                </>
              )}
              {selectedNodeType === "delay" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Duration (milliseconds)</Label>
                  <Input
                    type="number"
                    value={(config?.durationMs as number) ?? 1000}
                    onChange={(e) =>
                      updateNodeData(selectedNode.id, {
                        config: { ...config, durationMs: Number(e.target.value) },
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
                      value={(config?.name as string) ?? ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, name: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Variable Value</Label>
                    <Input
                      value={(config?.value as string) ?? ""}
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, value: e.target.value },
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
                      value={(config?.template as string) ?? ""}
                      placeholder="welcome.html"
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, template: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      value={(config?.to as string) ?? ""}
                      placeholder="{{ user.email }}"
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, to: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <Input
                      value={(config?.subject as string) ?? ""}
                      placeholder="Welcome to our platform!"
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, subject: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                </>
              )}
              {selectedNodeType === "point_read" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      Point Name
                      {(() => {
                        const name = (config?.pointName as string) ?? "";
                        return name && !pointNames.includes(name) ? (
                          <span className="text-amber-500 flex items-center gap-0.5 text-[10px]">
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
                      <ComboboxInput className="w-full" showTrigger showClear />
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
                </>
              )}
              {selectedNodeType === "point_write" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      Point Name
                      {(() => {
                        const name = (config?.pointName as string) ?? "";
                        return name && !pointNames.includes(name) ? (
                          <span className="text-amber-500 flex items-center gap-0.5 text-[10px]">
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
                      <ComboboxInput className="w-full" showTrigger showClear />
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
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Value Key</Label>
                    <Input
                      value={(config?.valueKey as string) ?? ""}
                      placeholder="values key"
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, valueKey: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    <Input
                      value={(config?.value as string) ?? ""}
                      placeholder="e.g. 0 or {{ readNode.value + 1 }}"
                      onChange={(e) =>
                        updateNodeData(selectedNode.id, {
                          config: { ...config, value: e.target.value },
                        })
                      }
                      className="h-9 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950"
                    />
                  </div>
                </>
              )}
              {getPluginNodeDef(selectedNodeType) && (
                <NodeConfigPanel
                  nodeId={selectedNode.id}
                  nodeName={(selectedNode.data.label as string) ?? selectedNode.id}
                  nodeType={selectedNodeType}
                  currentConfig={config}
                  schema={getPluginNodeDef(selectedNodeType)?.schema ?? {}}
                  availableVersions={[]}
                  currentVersion={(config?.__version as string) ?? "latest"}
                  onChange={(newConfig) =>
                    updateNodeData(selectedNode.id, {
                      config: { ...config, ...newConfig },
                    })
                  }
                  onVersionChange={() => {}}
                />
              )}
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Configure the node parameters above. Changes will be applied when you save the
                  workflow.
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
            onClick={() => updateNodeData(selectedNode.id, selectedNode.data)}
          >
            Update Node
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900 dark:hover:bg-rose-950"
              onClick={() => onDeleteNode(selectedNode.id)}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
