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
import { evaluateExpression } from "./expr";

export { executeSubGraph };

interface InternalExecutionState {
  context: ExecutionContext;
  nodeLogs: NodeLogEntry[];
  completed: Set<string>;
  failed: Set<string>;
  workflowId: string;
  executionId: string;
}

/**
 * Build the `output` object from a node's custom output config.
 *
 * Supported formats:
 *   - Record<string, string>: each key is the output field name, value is a path or expression
 *   - Single string: a path or expression template; if the result is an object it is spread
 *     directly into output, otherwise stored under the key "value"
 *
 * Each entry is either a path string (e.g. "ResultPointObjArr[0].value")
 * or an expression template (e.g. "{{ raw.value * 2 }}").
 */
function buildOutput(
  raw: Record<string, unknown>,
  outputsConfig: Record<string, string> | string | undefined,
): Record<string, unknown> {
  if (!outputsConfig) return {};

  // Single string: evaluate and spread into output (objects) or wrap under "value" (primitives)
  if (typeof outputsConfig === "string") {
    const trimmed = outputsConfig.trim();
    let evaluated: unknown;
    if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
      const inner = trimmed.slice(2, -2).trim();
      try {
        evaluated = evaluateExpression(inner, { raw });
      } catch {
        evaluated = undefined;
      }
    } else {
      evaluated = walkPath(raw, trimmed);
    }
    if (evaluated !== null && typeof evaluated === "object" && !Array.isArray(evaluated)) {
      return evaluated as Record<string, unknown>;
    }
    return { value: evaluated };
  }

  if (typeof outputsConfig !== "object") return {};
  const result: Record<string, unknown> = {};
  for (const [key, exprOrPath] of Object.entries(outputsConfig)) {
    if (typeof exprOrPath !== "string") {
      result[key] = exprOrPath;
      continue;
    }
    const trimmed = exprOrPath.trim();
    // Expression template: {{ expr }}
    if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) {
      const inner = trimmed.slice(2, -2).trim();
      try {
        result[key] = evaluateExpression(inner, { raw });
      } catch {
        result[key] = undefined;
      }
    } else {
      // Plain path: walk the raw object
      result[key] = walkPath(raw, trimmed);
    }
  }
  return result;
}

/** Walk a dot/bracket path like "ResultPointObjArr[0].value". */
function walkPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current == null) return undefined;
    const bracketMatch = part.match(/^([^[]+)((?:\[[^\]]+\])+)$/);
    if (bracketMatch) {
      current = (current as Record<string, unknown>)[bracketMatch[1]!];
      for (const idx of bracketMatch[2].matchAll(/\[([^\]]+)\]/g)) {
        if (current == null) return undefined;
        const raw = idx[1]!.trim();
        const isQuoted =
          (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
        current = isQuoted
          ? (current as Record<string, unknown>)[raw.slice(1, -1)]
          : Array.isArray(current)
            ? current[Number(raw)]
            : (current as Record<string, unknown>)[raw];
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }
  return current;
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

    const nodeResult = await executePluginNode(node, state, dsl, registry, dryRun);

    // Build output from custom output config (node returns { input, raw })
    const raw = (nodeResult.raw ?? {}) as Record<string, unknown>;
    const outputsConfig = node.config.outputs as Record<string, string> | string | undefined;
    const output = buildOutput(raw, outputsConfig);

    const outputs: Record<string, unknown> = {
      _meta: {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        status: "completed" as const,
      },
      input: nodeResult.input,
      output,
      raw,
    };

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

    const err = error as Error;

    // Build structured error report
    const lines: string[] = [];

    // Node metadata
    lines.push(`Node [${node.type}] "${node.name}" (id=${node.id}) failed`);
    lines.push("");

    // Error message
    lines.push(`Error: ${err.message}`);

    // Stack trace
    if (err.stack) {
      lines.push("");
      lines.push("Stack:");
      // Skip the first line (the error message itself)
      const stackLines = err.stack.split("\n").slice(1);
      for (const s of stackLines) {
        lines.push(`  ${s.trim()}`);
      }
    }

    // Cause chain
    let cause = (err as Error & { cause?: unknown }).cause;
    let depth = 0;
    while (cause && depth < 5) {
      lines.push("");
      lines.push(
        `${"Caused by".padStart(depth === 0 ? 0 : depth * 2)}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      if (cause instanceof Error && cause.stack) {
        const causeStack = cause.stack.split("\n").slice(1);
        for (const s of causeStack) {
          lines.push(`  ${s.trim()}`);
        }
      }
      cause = cause instanceof Error ? (cause as Error & { cause?: unknown }).cause : undefined;
      depth++;
    }

    // Node config (input values)
    const resolvedConfig = node.config;
    const configEntries = Object.entries(resolvedConfig).filter(([k]) => !k.startsWith("__"));
    if (configEntries.length > 0) {
      lines.push("");
      lines.push("Input config:");
      for (const [k, v] of configEntries) {
        const display =
          typeof v === "string" && v.length > 120 ? v.slice(0, 120) + "…" : JSON.stringify(v);
        lines.push(`  ${k}: ${display}`);
      }
    }

    // Context
    lines.push("");
    lines.push(`Context: workflow=${state.workflowId}, execution=${state.executionId}`);

    log.error = lines.join("\n");

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
  startNodeId?: string,
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

  let startNode: WorkflowNode | undefined;
  if (startNodeId) {
    startNode = dsl.nodes.find((n) => n.id === startNodeId);
  } else {
    const triggerNodeTypes = registry?.getTriggerNodeIds() ?? ["start"];
    startNode = dsl.nodes.find((n) => triggerNodeTypes.includes(n.type));
  }

  if (!startNode) {
    return {
      status: "failed",
      error: "Workflow has no entry trigger node",
      nodeLogs: [],
      dryRun,
    };
  }

  try {
    await executeFromNode(startNode, state, dsl, registry, dryRun, callbacks);

    const endNodes = dsl.nodes.filter((n) => n.type === "end");
    const lastEnd = endNodes.find((n) => state.completed.has(n.id));

    const trimmedLogs = state.nodeLogs.slice(-500);

    // If any node failed, mark the entire workflow as failed
    const hasFailedNode = trimmedLogs.some((log) => log.status === "failed");

    return {
      status: hasFailedNode ? "failed" : "completed",
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
