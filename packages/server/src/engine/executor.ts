import type {
  WorkflowDSL,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  NodeLogEntry,
  ExecutionResult,
} from "./types";
import { executePluginNode } from "./plugin-executor";
import type { PluginRegistry } from "./plugin-registry";
import { executeSubGraph } from "./sub-graph";

export { executeSubGraph };

interface InternalExecutionState {
  context: ExecutionContext;
  nodeLogs: NodeLogEntry[];
  completed: Set<string>;
  failed: Set<string>;
  workflowId: string;
  executionId: string;
}

export interface ExecutionCallbacks {
  onNodeLog?: (log: NodeLogEntry) => void | Promise<void>;
}

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function getEdgeByLabel(
  nodeId: string,
  label: string,
  edges: WorkflowEdge[],
): WorkflowEdge | undefined {
  return edges.find((e) => e.source === nodeId && e.label === label);
}

function createLogEntry(node: WorkflowNode, status: NodeLogEntry["status"]): NodeLogEntry {
  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    status,
    startedAt: new Date().toISOString(),
  };
}

async function executeNode(
  node: WorkflowNode,
  state: InternalExecutionState,
  dsl: WorkflowDSL,
  registry: PluginRegistry | null,
  dryRun = false,
  callbacks: ExecutionCallbacks = {},
): Promise<Record<string, unknown>> {
  const ctx = state.context;
  const log = createLogEntry(node, "running");
  state.nodeLogs.push(log);
  const startTime = Date.now();

  try {
    if (!registry) {
      throw new Error(`Plugin registry not available for node type: ${node.type}`);
    }

    const version = node.config.__version as string | undefined;
    const plugin = registry.resolveForExecution(node.type, version);
    if (!plugin) {
      throw new Error(`Plugin node type '${node.type}' not found`);
    }

    const outputs = await executePluginNode(node, state, dsl, registry, dryRun);

    log.status = "completed";
    log.completedAt = new Date().toISOString();
    log.durationMs = Date.now() - startTime;
    log.output = outputs;
    ctx.nodeOutputs.set(node.id, outputs);
    state.completed.add(node.id);
    if (callbacks.onNodeLog) {
      await callbacks.onNodeLog(log);
    }
    return outputs;
  } catch (error) {
    log.status = "failed";
    log.completedAt = new Date().toISOString();
    log.durationMs = Date.now() - startTime;

    const originalMsg = (error as Error).message;
    log.error = [
      `Node [${node.type}] "${node.name}" (id=${node.id}) failed`,
      `Error: ${originalMsg}`,
      `Context: workflow=${state.workflowId}, execution=${state.executionId}`,
    ].join("\n");

    state.failed.add(node.id);
    if (callbacks.onNodeLog) {
      await callbacks.onNodeLog(log);
    }

    if (node.onError) {
      const handler = node.onError;
      if (handler.action === "retry" && handler.retryCount && handler.retryCount > 0) {
        const retryNode = { ...node, onError: { ...handler, retryCount: handler.retryCount - 1 } };
        if (handler.retryDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, handler.retryDelayMs));
        }
        return executeNode(retryNode, state, dsl, registry, dryRun);
      }
      if (handler.action === "skip") {
        log.status = "skipped";
        return {};
      }
      if (handler.action === "goto" && handler.gotoNodeId) {
        return { __goto: handler.gotoNodeId };
      }
    }

    throw error;
  }
}

async function executeFromNode(
  startNode: WorkflowNode,
  state: InternalExecutionState,
  dsl: WorkflowDSL,
  registry: PluginRegistry | null,
  dryRun = false,
  callbacks: ExecutionCallbacks = {},
): Promise<void> {
  let currentNode: WorkflowNode | undefined = startNode;
  const visitedInPath = new Set<string>();

  while (currentNode) {
    if (visitedInPath.has(currentNode.id)) {
      break;
    }
    visitedInPath.add(currentNode.id);

    try {
      const outputs = await executeNode(currentNode, state, dsl, registry, dryRun, callbacks);

      // Handle goto
      if (outputs.__goto && typeof outputs.__goto === "string") {
        const gotoNode = dsl.nodes.find((n) => n.id === outputs.__goto);
        currentNode = gotoNode;
        continue;
      }

      // Find next node
      const outgoing = getOutgoingEdges(currentNode.id, dsl.edges);

      if (currentNode.type === "condition") {
        const result = outputs.result as boolean;
        const edge = getEdgeByLabel(currentNode.id, result ? "true" : "false", dsl.edges);
        currentNode = edge ? dsl.nodes.find((n) => n.id === edge.target) : undefined;
      } else if (currentNode.type === "switch") {
        const matched = String(outputs.matched ?? "default");
        const edge =
          getEdgeByLabel(currentNode.id, matched, dsl.edges) ??
          getEdgeByLabel(currentNode.id, "default", dsl.edges);
        currentNode = edge ? dsl.nodes.find((n) => n.id === edge.target) : undefined;
      } else if (currentNode.type === "end") {
        currentNode = undefined;
      } else {
        if (outgoing.length > 0) {
          currentNode = dsl.nodes.find((n) => n.id === outgoing[0]!.target);
        } else {
          currentNode = undefined;
        }
      }
    } catch {
      break;
    }
  }
}

export async function executeWorkflow(
  dsl: WorkflowDSL,
  triggerData: Record<string, unknown>,
  envVars: Record<string, string>,
  secrets: Record<string, string> = {},
  registry: PluginRegistry | null = null,
  dryRun = false,
  workflowId = "unknown",
  executionId = "unknown",
  prePopulatedOutputs?: Map<string, Record<string, unknown>>,
  callbacks: ExecutionCallbacks = {},
): Promise<ExecutionResult> {
  const ctx: ExecutionContext = {
    triggerData,
    variables: new Map(),
    nodeOutputs: new Map(prePopulatedOutputs ?? []),
    env: envVars,
    secrets,
  };

  const state: InternalExecutionState = {
    context: ctx,
    nodeLogs: [],
    completed: new Set(),
    failed: new Set(),
    workflowId,
    executionId,
  };

  const startNode = dsl.nodes.find((n) => n.type === "start");
  if (!startNode) {
    return {
      status: "failed",
      error: "Workflow has no 'start' node",
      nodeLogs: [],
      dryRun,
    };
  }

  try {
    await executeFromNode(startNode, state, dsl, registry, dryRun, callbacks);

    const endNodes = dsl.nodes.filter((n) => n.type === "end");
    const lastEnd = endNodes.find((n) => state.completed.has(n.id));

    const trimmedLogs = state.nodeLogs.slice(-500);

    return {
      status: "completed",
      output: lastEnd ? ctx.nodeOutputs.get(lastEnd.id) : undefined,
      nodeLogs: trimmedLogs,
      dryRun,
    };
  } catch (error) {
    return {
      status: "failed",
      error: (error as Error).message,
      nodeLogs: state.nodeLogs.slice(-500),
      dryRun,
    };
  }
}
