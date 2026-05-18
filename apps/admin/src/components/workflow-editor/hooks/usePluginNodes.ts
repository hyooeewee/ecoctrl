import { useCallback, useEffect, useState } from "react";
import { nodesApi, NodeDefinition } from "@/api/nodes";

const BUILT_IN_NODE_TYPES = new Set([
  "start",
  "end",
  "condition",
  "switch",
  "loop",
  "parallel",
  "delay",
  "http_request",
  "database",
  "email",
  "variable",
  "point_read",
  "point_write",
]);

export function usePluginNodes() {
  const [pluginNodes, setPluginNodes] = useState<NodeDefinition[]>([]);

  useEffect(() => {
    let cancelled = false;

    nodesApi
      .getAll()
      .then((nodes) => {
        if (!cancelled) {
          // Filter out built-in plugins (ecoctrl-* prefix) from the plugin list;
          // they are handled by the built-in node system and should not appear
          // in the "Plugin Nodes" category.
          setPluginNodes(nodes.filter((n) => !n.id.startsWith("ecoctrl-")));
        }
      })
      .catch(() => {
        // Silently ignore fetch errors; consumer can observe empty pluginNodes.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isPluginNodeType = useCallback((nodeType: string): boolean => {
    return !BUILT_IN_NODE_TYPES.has(nodeType);
  }, []);

  const getPluginNodeDef = useCallback(
    (nodeType: string): NodeDefinition | null => {
      return pluginNodes.find((n) => n.id === nodeType) ?? null;
    },
    [pluginNodes],
  );

  return {
    pluginNodes,
    isPluginNodeType,
    getPluginNodeDef,
  };
}
