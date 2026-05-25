import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 60;

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, align: "UL" });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);

    // Fallback for invalid dagre output (e.g., single node or disconnected graph)
    if (
      typeof pos.x !== "number" ||
      typeof pos.y !== "number" ||
      Number.isNaN(pos.x) ||
      Number.isNaN(pos.y)
    ) {
      const index = nodes.findIndex((n) => n.id === node.id);
      return {
        ...node,
        position: {
          x: index * (NODE_WIDTH + 120),
          y: 0,
        },
      };
    }

    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}
