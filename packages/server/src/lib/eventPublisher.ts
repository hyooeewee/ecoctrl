import { emitEvent } from "./notifyTrigger";
import type { WorkflowExecutionPayload, WorkflowNodeStatusPayload } from "@/sse/types";

export async function publishWorkflowExecution(
  workflowId: string,
  executionId: string,
  status: WorkflowExecutionPayload["status"],
  triggerData?: Record<string, unknown>,
  errorMessage?: string | null,
  durationMs?: number,
): Promise<void> {
  const payload: WorkflowExecutionPayload = {
    workflowId,
    executionId,
    status,
    triggerData,
    errorMessage,
    durationMs,
    timestamp: new Date().toISOString(),
  };
  await emitEvent("workflow_execution", payload);
}

export async function publishWorkflowNodeStatus(
  workflowId: string,
  executionId: string,
  nodeId: string,
  nodeName: string,
  nodeType: string,
  status: WorkflowNodeStatusPayload["status"],
  durationMs?: number,
  error?: string,
  output?: Record<string, unknown>,
): Promise<void> {
  // Strip `raw` from the notification payload — it can be large (e.g. full history data)
  // and exceeds PostgreSQL NOTIFY's 8000-byte limit. Raw data is already in execution logs.
  const { raw: _raw, ...outputRest } = output ?? {};
  const payload: WorkflowNodeStatusPayload = {
    workflowId,
    executionId,
    nodeId,
    nodeName,
    nodeType,
    status,
    durationMs,
    error,
    output: Object.keys(outputRest).length > 0 ? outputRest : undefined,
    timestamp: new Date().toISOString(),
  };
  await emitEvent("workflow_node_status", payload);
}
