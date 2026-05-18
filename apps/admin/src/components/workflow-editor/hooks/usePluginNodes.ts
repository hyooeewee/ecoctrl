import { useCallback, useEffect, useState } from "react";
import { nodesApi, NodeDefinition } from "@/api/nodes";

// Backend manifests use kebab-case IDs for some built-in nodes,
// but the rest of the frontend uses snake_case. Normalize here.
const ID_OVERRIDES: Record<string, string> = {
  "http-request": "http_request",
  "point-read": "point_read",
  "point-write": "point_write",
};

function normalizeNodeId(id: string): string {
  return ID_OVERRIDES[id] ?? id;
}

export function usePluginNodes() {
  const [pluginNodes, setPluginNodes] = useState<NodeDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;

    nodesApi
      .getAll()
      .then((nodes) => {
        if (!cancelled) {
          setPluginNodes(
            nodes.map((n) => ({
              ...n,
              id: normalizeNodeId(n.id),
            })),
          );
        }
      })
      .catch(() => {
        // Silently ignore fetch errors; consumer can observe empty pluginNodes.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const getNodeDef = useCallback(
    (nodeType: string): NodeDefinition | null => {
      return pluginNodes.find((n) => n.id === nodeType) ?? null;
    },
    [pluginNodes],
  );

  return {
    pluginNodes,
    getNodeDef,
  };
}
