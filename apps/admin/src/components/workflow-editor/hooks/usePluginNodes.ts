import { useCallback, useEffect, useState } from "react";
import { nodesApi, NodeDefinition } from "@/api/nodes";

export function usePluginNodes() {
  const [pluginNodes, setPluginNodes] = useState<NodeDefinition[]>([]);

  const refresh = useCallback(async () => {
    try {
      const nodes = await nodesApi.getAll();
      setPluginNodes(nodes);
    } catch {
      // Silently ignore fetch errors.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getNodeDef = useCallback(
    (nodeType: string): NodeDefinition | null => {
      return pluginNodes.find((n) => n.id === nodeType) ?? null;
    },
    [pluginNodes],
  );

  return {
    pluginNodes,
    getNodeDef,
    refresh,
  };
}
