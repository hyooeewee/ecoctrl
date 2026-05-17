export type TriggerType = "state_change" | "schedule" | "manual" | "webhook" | "event";

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export type NodeType =
  | "start"
  | "end"
  | "condition"
  | "switch"
  | "loop"
  | "parallel"
  | "delay"
  | "http_request"
  | "database"
  | "email"
  | "variable"
  | "point_read"
  | "point_write"
  // Plugin nodes (any string)
  | string;

export interface WorkflowNode {
  id: string;
  type: NodeType | string;
  name: string;
  config: Record<string, unknown>;
  onError?: {
    action: "retry" | "skip" | "abort" | "goto";
    retryCount?: number;
    retryDelayMs?: number;
    gotoNodeId?: string;
  };
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface WorkflowDSL {
  version: "1.0";
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: string;
  tags?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  triggerData: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  nodeLogs: Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    output?: Record<string, unknown>;
    error?: string;
  }>;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

export type DynamicNodeType = string;

export interface PluginNodeDefinition {
  id: string;
  name: string;
  category: "trigger" | "action" | "condition";
  icon?: string;
  schema: Record<string, unknown>;
  version: string;
}
