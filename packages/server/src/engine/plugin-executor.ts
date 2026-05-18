import type { WorkflowNode, WorkflowDSL, ExecutionContext, NodeLogEntry } from "./types";
import type { PluginRegistry } from "./plugin-registry";
import { createPluginApi } from "./plugin-api";
import { executeInSandbox } from "./plugin-sandbox";

interface InternalExecutionState {
  context: ExecutionContext;
  nodeLogs: NodeLogEntry[];
  completed: Set<string>;
  failed: Set<string>;
  workflowId: string;
  executionId: string;
}

export async function executePluginNode(
  node: WorkflowNode,
  state: InternalExecutionState,
  _dsl: WorkflowDSL,
  registry: PluginRegistry,
  dryRun = false,
): Promise<Record<string, unknown>> {
  const version = node.config.__version as string | undefined;
  const plugin = registry.get(node.type, version);
  if (!plugin) {
    throw new Error(`Plugin node type '${node.type}' (version: ${version ?? "latest"}) not found`);
  }

  const ctx = state.context;

  // Build sandbox context
  const sandboxCtx: Record<string, unknown> = {
    config: node.config,
    variables: Object.fromEntries(ctx.variables),
    triggerData: ctx.triggerData,
    workflowId: "", // Will be populated by caller
    executionId: "",
    nodeId: node.id,
    nodeName: node.name,
  };

  const api = createPluginApi(
    ctx,
    state.workflowId,
    state.executionId,
    node.id,
    node.name,
    registry,
    dryRun,
  );

  if (dryRun) {
    return {
      _dryRun: true,
      pluginId: plugin.id,
      version: plugin.version,
      config: node.config,
    };
  }

  const result = await executeInSandbox(plugin.backendCode, sandboxCtx, api);
  return result;
}
