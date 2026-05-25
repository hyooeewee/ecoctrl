import { createContext } from "react";
import type { NodeDefinition } from "@/api/nodes";

/** Context to access plugin node definitions inside ReactFlow node components. */
export const PluginNodesContext = createContext<NodeDefinition[]>([]);
