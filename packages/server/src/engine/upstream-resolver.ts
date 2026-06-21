import { executeWorkflow } from "./executor";
import { findLatestNodeOutput } from "@/repositories/workflows";
import type { WorkflowDSL, WorkflowNode, NodeLogEntry, ExecutionResult } from "./types";
import type { PluginRegistry } from "./plugin-registry";

// ========================================
// Template scanning
// ========================================

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;
const EXPR_OPERATOR_REGEX = / (?:[+\-*/%><=!&|?:]) /;
const TOKEN_SEPARATOR_REGEX = /[^A-Za-z0-9_-]+/;

const RESERVED_PREFIXES = ["var.", "vars.", "secret.", "trigger."];
const RESERVED_EXACT = new Set(["now()", "uuid()"]);

/**
 * Recursively scan a node config and collect all referenced node IDs.
 *
 * Simple references: {{nodeId.outputKey}}
 * Expressions: scanned against allNodeIds when provided.
 */
export function extractReferencedNodeIds(config: unknown, allNodeIds?: Set<string>): Set<string> {
  const ids = new Set<string>();

  function scan(value: unknown): void {
    if (typeof value === "string") {
      for (const match of Array.from(value.matchAll(TEMPLATE_REGEX))) {
        const raw = match[1]!.trim();

        // Expression with operators: look for known node IDs.
        if (EXPR_OPERATOR_REGEX.test(raw)) {
          if (allNodeIds) {
            for (const token of raw.split(TOKEN_SEPARATOR_REGEX)) {
              if (allNodeIds.has(token)) {
                ids.add(token);
              }
            }
          }
          continue;
        }

        // Simple dotted path: first segment is the namespace/nodeId.
        if (RESERVED_PREFIXES.some((prefix) => raw.startsWith(prefix))) continue;

        // Function call (e.g. map(...)) — not a node reference
        if (/^\w+\(/.test(raw)) continue;

        const parts = raw.split(".");
        if (parts.length < 2) continue;

        const first = parts[0];
        if (RESERVED_EXACT.has(first)) continue;

        ids.add(first);
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }

    if (value !== null && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(scan);
    }
  }

  scan(config);
  return ids;
}

// ========================================
// Upstream resolution
// ========================================

export interface UpstreamResolutionResult {
  nodeOutputs: Map<string, Record<string, unknown>>;
  nodeLogs: NodeLogEntry[];
}

/**
 * Resolve all upstream outputs needed to test a single node.
 *
 * For every referenced upstream node we try history first; if there is no
 * successful history we recursively resolve and execute that node.
 */
export async function resolveUpstreamOutputs(
  workflowId: string,
  targetNodeId: string,
  dsl: WorkflowDSL,
  registry: PluginRegistry | null,
  envVars: Record<string, string>,
  secrets: Record<string, string>,
  dryRun: boolean,
  triggerData: Record<string, unknown>,
): Promise<UpstreamResolutionResult> {
  const allNodeIds = new Set(dsl.nodes.map((n) => n.id));
  const resolved = new Map<string, Record<string, unknown>>();
  const logs: NodeLogEntry[] = [];
  const visiting = new Set<string>();

  console.log("[upstream] allNodeIds:", [...allNodeIds]);

  const targetNode = dsl.nodes.find((n) => n.id === targetNodeId);
  if (targetNode) {
    const referencedIds = extractReferencedNodeIds(targetNode.config, allNodeIds);
    console.log("[upstream] referencedIds for", targetNodeId, ":", [...referencedIds]);
    for (const refId of referencedIds) {
      await resolveNode(refId);
    }
  }

  return { nodeOutputs: resolved, nodeLogs: logs };

  async function resolveNode(nodeId: string): Promise<void> {
    console.log("[upstream] resolveNode:", nodeId, "exists:", allNodeIds.has(nodeId));
    if (resolved.has(nodeId)) return;

    if (visiting.has(nodeId)) {
      throw new Error(
        `Circular dependency detected in node test: ${Array.from(visiting).join(" -> ")} -> ${nodeId}`,
      );
    }

    const node = dsl.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Referenced node ${nodeId} not found in workflow DSL`);
    }

    if (node.type === "start" || node.type === "end") {
      resolved.set(nodeId, {});
      return;
    }

    visiting.add(nodeId);

    // Prefer historical output from the latest successful execution.
    const historyOutput = await findLatestNodeOutput(workflowId, nodeId);
    if (historyOutput) {
      resolved.set(nodeId, historyOutput);
      visiting.delete(nodeId);
      return;
    }

    // Recursively resolve this node's own upstream references.
    const referencedIds = extractReferencedNodeIds(node.config, allNodeIds);
    for (const refId of referencedIds) {
      await resolveNode(refId);
    }

    // Execute the node in isolation with all resolved upstream outputs.
    const result = await executeTestNode(node);
    const nodeLog = result.nodeLogs.find(
      (log) => log.nodeId === nodeId && log.status === "completed",
    );

    resolved.set(nodeId, nodeLog?.output ?? {});
    logs.push(...result.nodeLogs);

    visiting.delete(nodeId);
  }

  async function executeTestNode(node: WorkflowNode): Promise<ExecutionResult> {
    const startNode = dsl.nodes.find((n) => n.type === "start") ?? {
      id: "start",
      type: "start",
      name: "开始",
      config: {},
    };
    const endNode = dsl.nodes.find((n) => n.type === "end") ?? {
      id: "end",
      type: "end",
      name: "结束",
      config: {},
    };

    const testDsl: WorkflowDSL = {
      version: "1.0",
      nodes: [startNode, node, endNode],
      edges: [
        { id: `e-start-${node.id}`, source: startNode.id, target: node.id },
        { id: `e-${node.id}-end`, source: node.id, target: endNode.id },
      ],
      envVars: dsl.envVars,
      settings: dsl.settings,
    };

    return executeWorkflow(
      testDsl,
      triggerData,
      envVars,
      secrets,
      registry,
      dryRun,
      workflowId,
      "test",
      resolved,
    );
  }
}
