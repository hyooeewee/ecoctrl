export type TriggerType = "state_change" | "schedule" | "manual" | "webhook" | "event";

export interface StateChangeTriggerConfig {
  watch: string[];
  condition?: string;
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone: string;
}

export interface ManualTriggerConfig {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
}

export interface WebhookTriggerConfig {
  secret?: string;
  allowedIps?: string[];
}

export interface EventTriggerConfig {
  event: string;
  condition?: string;
}

export type TriggerConfig =
  | StateChangeTriggerConfig
  | ScheduleTriggerConfig
  | ManualTriggerConfig
  | WebhookTriggerConfig
  | EventTriggerConfig;

export interface WorkflowTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

export type NodeType = string;

export interface ErrorHandler {
  action: "retry" | "skip" | "abort" | "goto";
  retryCount?: number;
  retryDelayMs?: number;
  gotoNodeId?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  onError?: ErrorHandler;
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

export interface WorkflowSettings {
  autoSave?: {
    enabled?: boolean;
    intervalSeconds?: number;
  };
}

export interface WorkflowDSL {
  version: "1.0";
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  envVars?: Array<{
    key: string;
    value: unknown;
    type: "string" | "number" | "secret" | "boolean";
    description?: string;
  }>;
  settings?: WorkflowSettings;
}

export interface ExecutionContext {
  triggerData: Record<string, unknown>;
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, Record<string, unknown>>;
  env: Record<string, string>;
  secrets: Record<string, string>;
}

export interface NodeLogEntry {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionResult {
  status: "completed" | "failed";
  output?: Record<string, unknown>;
  error?: string;
  nodeLogs: NodeLogEntry[];
  dryRun?: boolean;
}
