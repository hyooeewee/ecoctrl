import type { Node, Edge } from "@xyflow/react";
import type { WorkflowDSL, WorkflowTrigger, WorkflowNode } from "./types";

export function dslToReactFlow(dsl: WorkflowDSL): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: dsl.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position ?? { x: 0, y: 0 },
      data: {
        label: n.name,
        config: n.config,
        onError: n.onError,
      },
    })),
    edges: dsl.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
      type: e.sourceHandle ? "condition" : "default",
    })),
  };
}

export function reactFlowToDSL(
  nodes: Node[],
  edges: Edge[],
  trigger: WorkflowTrigger,
): WorkflowDSL {
  return {
    version: "1.0",
    trigger,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as WorkflowDSL["nodes"][number]["type"],
      name: (n.data.label as string) ?? n.id,
      config: (n.data.config as Record<string, unknown>) ?? {},
      onError: n.data.onError as WorkflowNode["onError"],
      position: n.position,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      label: e.label as string | undefined,
    })),
  };
}
