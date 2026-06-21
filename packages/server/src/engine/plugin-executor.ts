import type { WorkflowNode, WorkflowDSL, ExecutionContext, NodeLogEntry } from "./types";
import type { PluginRegistry } from "./plugin-registry";
import { createPluginApi } from "./plugin-api";
import { executeInSandbox } from "./plugin-sandbox";
import { resolveTemplate } from "./template";

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
  const plugin = registry.resolveForExecution(node.type, version);
  if (!plugin) {
    throw new Error(`Plugin node type '${node.type}' (version: ${version ?? "latest"}) not found`);
  }

  const ctx = state.context;

  // Build sandbox context — node outputs are accessed via {{nodeId.key}} template syntax
  // Exclude `outputs` from template resolution: it uses `raw` which is only available in buildOutput
  const { outputs: _outputsConfig, ...configRest } = node.config;
  const resolvedConfig = resolveTemplate(configRest, ctx) as Record<string, unknown>;
  if (_outputsConfig !== undefined) {
    resolvedConfig.outputs = _outputsConfig;
  }

  const sandboxCtx: Record<string, unknown> = {
    config: resolvedConfig,
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
    node.config,
  );

  const result = await executeInSandbox(plugin.backendCode, sandboxCtx, api);
  return result;
}
