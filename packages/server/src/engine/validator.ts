import type { WorkflowDSL, WorkflowNode, WorkflowEdge } from "./types";

export interface ValidationError {
  field: string;
  message: string;
}

function hasEdgeTo(nodeId: string, edges: WorkflowEdge[]): boolean {
  return edges.some((e) => e.target === nodeId);
}

function hasEdgeFrom(nodeId: string, edges: WorkflowEdge[]): boolean {
  return edges.some((e) => e.source === nodeId);
}

function getOutgoingEdges(nodeId: string, edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

function detectCycle(
  nodeId: string,
  edges: WorkflowEdge[],
  visited: Set<string>,
  recStack: Set<string>,
): boolean {
  visited.add(nodeId);
  recStack.add(nodeId);

  const outgoing = edges.filter((e) => e.source === nodeId);
  for (const edge of outgoing) {
    const target = edge.target;
    if (!visited.has(target)) {
      if (detectCycle(target, edges, visited, recStack)) {
        return true;
      }
    } else if (recStack.has(target)) {
      return true;
    }
  }

  recStack.delete(nodeId);
  return false;
}

export function validateDsl(dsl: WorkflowDSL, strict = false): ValidationError[] {
  const errors: ValidationError[] = [];
  const { nodes, edges } = dsl;

  // 1. Unique node IDs
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({ field: `nodes.${node.id}.id`, message: `Duplicate node ID: ${node.id}` });
    }
    nodeIds.add(node.id);
  }

  // 2. Edge references exist
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        field: `edges.${edge.id}.source`,
        message: `Source node not found: ${edge.source}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        field: `edges.${edge.id}.target`,
        message: `Target node not found: ${edge.target}`,
      });
    }
  }

  // 3. Exactly one start node
  const startNodes = nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    errors.push({ field: "nodes", message: "Workflow must have exactly one 'start' node" });
  } else if (startNodes.length > 1) {
    errors.push({
      field: "nodes",
      message: `Workflow has ${startNodes.length} 'start' nodes, expected 1`,
    });
  }

  // 4. At least one end node
  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length === 0) {
    errors.push({ field: "nodes", message: "Workflow must have at least one 'end' node" });
  }

  if (!strict) {
    return errors;
  }

  // 5. Connectivity (strict only)
  for (const node of nodes) {
    if (node.type !== "start" && !hasEdgeTo(node.id, edges)) {
      errors.push({
        field: `nodes.${node.id}`,
        message: `Node '${node.name}' has no incoming edges`,
      });
    }
    if (node.type !== "end" && !hasEdgeFrom(node.id, edges)) {
      errors.push({
        field: `nodes.${node.id}`,
        message: `Node '${node.name}' has no outgoing edges`,
      });
    }
  }

  // 6. Condition node labels (strict only)
  for (const node of nodes.filter((n) => n.type === "condition")) {
    const outgoing = getOutgoingEdges(node.id, edges);
    const labels = new Set(outgoing.map((e) => e.label));
    if (!labels.has("true")) {
      errors.push({
        field: `nodes.${node.id}`,
        message: `Condition node '${node.name}' missing 'true' branch`,
      });
    }
    if (!labels.has("false")) {
      errors.push({
        field: `nodes.${node.id}`,
        message: `Condition node '${node.name}' missing 'false' branch`,
      });
    }
  }

  // 7. Switch node labels (strict only)
  for (const node of nodes.filter((n) => n.type === "switch")) {
    const cases = (node.config.cases as Array<{ value: string }> | undefined) ?? [];
    const caseValues = new Set(cases.map((c) => String(c.value)));
    const outgoing = getOutgoingEdges(node.id, edges);
    const labels = new Set(outgoing.map((e) => e.label));
    for (const caseValue of caseValues) {
      if (!labels.has(caseValue)) {
        errors.push({
          field: `nodes.${node.id}`,
          message: `Switch node '${node.name}' missing edge for case '${caseValue}'`,
        });
      }
    }
    if (!labels.has("default")) {
      errors.push({
        field: `nodes.${node.id}`,
        message: `Switch node '${node.name}' missing 'default' branch`,
      });
    }
  }

  // 8. Loop node body validation (recursive, strict only)
  for (const node of nodes.filter((n) => n.type === "loop")) {
    const body = node.config.body as { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] } | undefined;
    if (body?.nodes && body.edges) {
      const bodyErrors = validateDsl(
        {
          version: "1.0",
          trigger: dsl.trigger,
          nodes: body.nodes,
          edges: body.edges,
        },
        strict,
      );
      for (const err of bodyErrors) {
        errors.push({ field: `nodes.${node.id}.body.${err.field}`, message: err.message });
      }
    }
    const mode = node.config.mode as string | undefined;
    if (mode === "foreach" && !node.config.items) {
      errors.push({
        field: `nodes.${node.id}.config.items`,
        message: `Loop node '${node.name}' (foreach) requires 'items'`,
      });
    }
    if (mode === "while" && !node.config.condition) {
      errors.push({
        field: `nodes.${node.id}.config.condition`,
        message: `Loop node '${node.name}' (while) requires 'condition'`,
      });
    }
    if (!node.config.itemVar && mode === "foreach") {
      errors.push({
        field: `nodes.${node.id}.config.itemVar`,
        message: `Loop node '${node.name}' requires 'itemVar'`,
      });
    }
  }

  // 9. Parallel node branch validation (strict only)
  for (const node of nodes.filter((n) => n.type === "parallel")) {
    const branches = node.config.branches as
      | Array<{ nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }>
      | undefined;
    if (branches) {
      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i]!;
        if (branch.nodes && branch.edges) {
          const branchErrors = validateDsl(
            {
              version: "1.0",
              trigger: dsl.trigger,
              nodes: branch.nodes,
              edges: branch.edges,
            },
            strict,
          );
          for (const err of branchErrors) {
            errors.push({
              field: `nodes.${node.id}.branches[${i}].${err.field}`,
              message: err.message,
            });
          }
        }
      }
    }
  }

  // 10. Cycle detection (strict only)
  if (startNodes.length === 1) {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    if (detectCycle(startNodes[0]!.id, edges, visited, recStack)) {
      errors.push({
        field: "edges",
        message: "Workflow contains a cycle (loops must use 'loop' node with embedded body)",
      });
    }
  }

  return errors;
}

export function isValidDsl(dsl: WorkflowDSL): boolean {
  return validateDsl(dsl).length === 0;
}
