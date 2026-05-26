export interface SseWorkflowExecution {
  workflowId: string;
  executionId: string;
  status: "pending" | "running" | "completed" | "failed";
  triggerData?: Record<string, unknown>;
  errorMessage?: string | null;
  durationMs?: number;
  timestamp: string;
}

export interface SseWorkflowNodeStatus {
  workflowId: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "running" | "completed" | "failed" | "skipped";
  durationMs?: number;
  error?: string;
  output?: Record<string, unknown>;
  timestamp: string;
}

export interface SseAlert {
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
}

export interface SseNotification {
  title: string;
  message: string;
  timestamp: string;
}

export type SseEventMap = {
  workflow_execution: SseWorkflowExecution;
  workflow_node_status: SseWorkflowNodeStatus;
  alert: SseAlert;
  notification: SseNotification;
  ping: { message: string };
};

export type SseEventType = keyof SseEventMap;
