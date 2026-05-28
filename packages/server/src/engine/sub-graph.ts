import type { WorkflowNode, WorkflowEdge, ExecutionContext } from "./types";
import type { PluginRegistry } from "./plugin-registry";
import { executePluginNode } from "./plugin-executor";

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

export async function executeSubGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  parentContext: ExecutionContext,
  registry: PluginRegistry | null,
  dryRun = false,
): Promise<Record<string, unknown>> {
  const startNode = nodes.find((n) => n.type === "start");
  if (!startNode || !registry) {
    return {};
  }

  const subCtx: ExecutionContext = {
    triggerData: parentContext.triggerData,
    variables: parentContext.variables,
    nodeOutputs: new Map(),
    env: parentContext.env,
    secrets: parentContext.secrets,
  };

  const state = {
    context: subCtx,
    nodeLogs: [],
    completed: new Set<string>(),
    failed: new Set<string>(),
    workflowId: "subgraph",
    executionId: "subgraph",
  };

  const dsl = {
    version: "1.0" as const,
    trigger: { type: "manual" as const, config: {} },
    nodes,
    edges,
  };

  let current: WorkflowNode | undefined = startNode;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);

    try {
      const outputs = await executePluginNode(current, state, dsl, registry, dryRun);

      // Handle goto
      if (outputs.__goto && typeof outputs.__goto === "string") {
        const gotoNode = nodes.find((n) => n.id === outputs.__goto);
        current = gotoNode;
        continue;
      }

      const outgoing = getOutgoingEdges(current.id, edges);

      if (current.type === "condition") {
        const result = outputs.result as boolean;
        const edge = getEdgeByLabel(current.id, result ? "true" : "false", edges);
        current = edge ? nodes.find((n) => n.id === edge.target) : undefined;
      } else if (current.type === "switch") {
        const matched = String(outputs.matched ?? "default");
        const edge =
          getEdgeByLabel(current.id, matched, edges) ??
          getEdgeByLabel(current.id, "default", edges);
        current = edge ? nodes.find((n) => n.id === edge.target) : undefined;
      } else if (current.type === "end") {
        current = undefined;
      } else {
        if (outgoing.length > 0) {
          current = nodes.find((n) => n.id === outgoing[0]!.target);
        } else {
          current = undefined;
        }
      }
    } catch {
      break;
    }
  }

  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length > 0) {
    const lastEnd = endNodes[endNodes.length - 1]!;
    return subCtx.nodeOutputs.get(lastEnd.id) ?? {};
  }
  return {};
}
