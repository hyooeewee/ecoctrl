import { db } from "@/config/database";
import { findPlatformConfig } from "@/repositories/platformConfig";
import { readPointValues, writePointValues } from "@/services/iot/points";
import { createTransport, type Transporter } from "nodemailer";
import { sql } from "drizzle-orm";
import type {
  WorkflowDSL,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  NodeLogEntry,
  ExecutionResult,
} from "./types";
import { evaluateExpression, evaluateBoolean } from "./expr";
import { resolveTemplate, buildVars } from "./template";
import { executePluginNode } from "./plugin-executor";
import type { PluginRegistry } from "./plugin-registry";

interface InternalExecutionState {
  context: ExecutionContext;
  nodeLogs: NodeLogEntry[];
  completed: Set<string>;
  failed: Set<string>;
  workflowId: string;
  executionId: string;
}

let smtpTransport: Transporter | null = null;
let smtpConfigTime = 0;

async function getSmtpTransport(): Promise<Transporter | null> {
  const now = Date.now();
  if (smtpTransport && now - smtpConfigTime < 60_000) {
    return smtpTransport;
  }
  const config = await findPlatformConfig();
  if (!config.smtpHost || !config.smtpUser) {
    return null;
  }
  smtpTransport = createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  smtpConfigTime = now;
  return smtpTransport;
}

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

function createLogEntry(node: WorkflowNode, status: NodeLogEntry["status"]): NodeLogEntry {
  return {
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type,
    status,
    startedAt: new Date().toISOString(),
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeNode(
  node: WorkflowNode,
  state: InternalExecutionState,
  dsl: WorkflowDSL,
  registry: PluginRegistry | null,
  dryRun = false,
): Promise<Record<string, unknown>> {
  // Reference dsl to avoid unused parameter warning (used in recursive calls)
  void dsl.nodes.length;
  const ctx = state.context;
  const log = createLogEntry(node, "running");
  state.nodeLogs.push(log);
  const startTime = Date.now();

  try {
    const config = resolveTemplate(node.config, ctx) as Record<string, unknown>;
    let outputs: Record<string, unknown> = {};

    switch (node.type) {
      case "start": {
        outputs = { data: ctx.triggerData };
        break;
      }

      case "end": {
        outputs = {
          status: config.status ?? "success",
          output: config.output ?? {},
        };
        break;
      }

      case "condition": {
        const vars = buildVars(ctx);
        const result = evaluateBoolean(String(config.expression ?? "false"), vars);
        outputs = { result };
        break;
      }

      case "switch": {
        const vars = buildVars(ctx);
        const value = evaluateExpression(String(config.expression ?? ""), vars);
        const cases =
          (config.cases as Array<{ value: string; operator?: string }> | undefined) ?? [];
        let matched = false;
        for (const c of cases) {
          const op = c.operator ?? "===";
          const caseValue = c.value;
          let match = false;
          switch (op) {
            case "===":
            case "==":
              match = value == caseValue;
              break;
            case "!=":
            case "!==":
              match = value != caseValue;
              break;
            case ">":
              match = (value as number) > Number(caseValue);
              break;
            case "<":
              match = (value as number) < Number(caseValue);
              break;
            case ">=":
              match = (value as number) >= Number(caseValue);
              break;
            case "<=":
              match = (value as number) <= Number(caseValue);
              break;
          }
          if (match) {
            matched = true;
            outputs = { value, matched: caseValue };
            break;
          }
        }
        if (!matched) {
          outputs = { value, matched: "default" };
        }
        break;
      }

      case "loop": {
        const mode = String(config.mode ?? "foreach");
        const maxIterations = Number(config.maxIterations ?? 100);
        const body = config.body as { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] } | undefined;

        if (mode === "foreach") {
          const items = resolveTemplate(config.items, ctx) as unknown[];
          const itemVar = String(config.itemVar ?? "item");
          const results: unknown[] = [];

          for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
            ctx.variables.set(itemVar, items[i]);
            ctx.variables.set("index", i);
            if (body?.nodes && body.edges) {
              const subResult = await executeSubGraph(
                body.nodes,
                body.edges,
                ctx,
                registry,
                dryRun,
              );
              results.push(subResult);
            }
          }
          outputs = { iterations: Math.min(items.length, maxIterations), results };
        } else if (mode === "while") {
          const vars = buildVars(ctx);
          let iterations = 0;
          const results: unknown[] = [];

          while (
            iterations < maxIterations &&
            evaluateBoolean(String(config.condition ?? "false"), vars)
          ) {
            if (body?.nodes && body.edges) {
              const subResult = await executeSubGraph(
                body.nodes,
                body.edges,
                ctx,
                registry,
                dryRun,
              );
              results.push(subResult);
            }
            iterations++;
            // Refresh vars for next iteration
            const freshVars = buildVars(ctx);
            Object.assign(vars, freshVars);
          }
          outputs = { iterations, results };
        }
        break;
      }

      case "parallel": {
        const branches = config.branches as
          | Array<{ nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }>
          | undefined;
        if (branches && branches.length > 0) {
          const branchResults = await Promise.all(
            branches.map(async (branch) => {
              if (branch.nodes && branch.edges) {
                return executeSubGraph(branch.nodes, branch.edges, ctx, registry, dryRun);
              }
              return {};
            }),
          );
          outputs = { branches: branchResults };
        } else {
          outputs = { branches: [] };
        }
        break;
      }

      case "delay": {
        const durationMs = Number(config.durationMs ?? 0);
        if (durationMs > 0 && durationMs <= 300_000) {
          // Max 5 minutes
          await sleep(durationMs);
        }
        outputs = { delayedMs: durationMs };
        break;
      }

      case "http_request": {
        const method = String(config.method ?? "GET").toUpperCase();
        const url = String(config.url ?? "");
        if (dryRun) {
          outputs = {
            statusCode: 200,
            statusText: "OK (dry-run)",
            headers: { "content-type": "application/json" },
            body: { _dryRun: true, method, url },
            responseBody: JSON.stringify({ _dryRun: true }),
          };
          break;
        }
        const headers = (config.headers as Record<string, string> | undefined) ?? {};
        const body = config.body as Record<string, unknown> | string | undefined;
        const timeoutMs = Math.min(Number(config.timeoutMs ?? 10_000), 30_000);
        const retryCount = Math.min(Number(config.retry ?? 0), 3);

        let lastError: Error | undefined;
        for (let attempt = 0; attempt <= retryCount; attempt++) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const fetchBody = body && typeof body === "object" ? JSON.stringify(body) : body;
            const response = await fetch(url, {
              method,
              headers,
              body: fetchBody,
              signal: controller.signal,
            });
            clearTimeout(timeout);
            const responseBody = await response.text();
            let parsedBody: unknown;
            try {
              parsedBody = JSON.parse(responseBody);
            } catch {
              parsedBody = responseBody;
            }
            outputs = {
              statusCode: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: parsedBody,
              responseBody,
            };
            break;
          } catch (err) {
            clearTimeout(timeout);
            lastError = err as Error;
            if (attempt < retryCount) {
              await sleep(1000 * (attempt + 1));
            }
          }
        }
        if (Object.keys(outputs).length === 0 && lastError) {
          throw lastError;
        }
        break;
      }

      case "database": {
        const operation = String(config.operation ?? "select");
        const table = String(config.table ?? "");
        if (dryRun) {
          outputs = {
            _dryRun: true,
            operation,
            table,
            message: `Would execute ${operation} on '${table}'`,
          };
          break;
        }
        const where = config.where as Record<string, unknown> | undefined;
        const data = config.data as Record<string, unknown> | undefined;
        const returning = config.returning as string[] | undefined;

        // Only allow known-safe table names (whitelist approach)
        const allowedTables = new Set([
          "objects",
          "energy_readings",
          "alert_logs",
          "workflow_executions",
          // Add more as needed
        ]);
        if (!allowedTables.has(table)) {
          throw new Error(`Table '${table}' is not in the allowed list`);
        }

        const tableId = sql.identifier(table);
        const retCols = returning ? sql.raw(returning.join(", ")) : sql.raw("*");

        if (operation === "select") {
          if (where && Object.keys(where).length > 0) {
            const conditions = Object.entries(where).map(
              ([k, v]) => sql`${sql.identifier(k)} = ${v}`,
            );
            const whereSql = sql.join(conditions, sql` AND `);
            const query = sql`SELECT ${retCols} FROM ${tableId} WHERE ${whereSql}`;
            const result = await db.execute(query);
            outputs = { rows: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`SELECT ${retCols} FROM ${tableId}`;
            const result = await db.execute(query);
            outputs = { rows: result as unknown[], count: (result as unknown[]).length };
          }
        } else if (operation === "insert") {
          if (!data || Object.keys(data).length === 0) {
            throw new Error("INSERT requires data");
          }
          const columns = Object.keys(data);
          const values = Object.values(data);
          const colIds = columns.map((c) => sql.identifier(c));
          const colSql = sql.join(colIds, sql`, `);
          const valSql = sql.join(
            values.map((v) => sql`${v}`),
            sql`, `,
          );
          const query = sql`INSERT INTO ${tableId} (${colSql}) VALUES (${valSql})${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
          const result = await db.execute(query);
          outputs = { inserted: result as unknown[], count: (result as unknown[]).length };
        } else if (operation === "update") {
          if (!data || Object.keys(data).length === 0) {
            throw new Error("UPDATE requires data");
          }
          const setConditions = Object.entries(data).map(
            ([k, v]) => sql`${sql.identifier(k)} = ${v}`,
          );
          const setSql = sql.join(setConditions, sql`, `);
          if (where && Object.keys(where).length > 0) {
            const whereConditions = Object.entries(where).map(
              ([k, v]) => sql`${sql.identifier(k)} = ${v}`,
            );
            const whereSql = sql.join(whereConditions, sql` AND `);
            const query = sql`UPDATE ${tableId} SET ${setSql} WHERE ${whereSql}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            outputs = { updated: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`UPDATE ${tableId} SET ${setSql}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            outputs = { updated: result as unknown[], count: (result as unknown[]).length };
          }
        } else if (operation === "delete") {
          if (where && Object.keys(where).length > 0) {
            const conditions = Object.entries(where).map(
              ([k, v]) => sql`${sql.identifier(k)} = ${v}`,
            );
            const whereSql = sql.join(conditions, sql` AND `);
            const query = sql`DELETE FROM ${tableId} WHERE ${whereSql}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            outputs = { deleted: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`DELETE FROM ${tableId}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            outputs = { deleted: result as unknown[], count: (result as unknown[]).length };
          }
        } else {
          throw new Error(`Unsupported database operation: ${operation}`);
        }
        break;
      }

      case "email": {
        const to = Array.isArray(config.to) ? config.to.map(String) : [String(config.to ?? "")];
        const subject = String(config.subject ?? "");
        if (dryRun) {
          outputs = {
            _dryRun: true,
            messageId: "dry-run-msg-id",
            sent: true,
            to: to.filter(Boolean),
            subject,
          };
          break;
        }
        const transport = await getSmtpTransport();
        if (!transport) {
          throw new Error("SMTP not configured");
        }
        const bodyText = String(config.body ?? "");
        const bodyType = String(config.bodyType ?? "text");
        const result = await transport.sendMail({
          from: "noreply@ecoctrl.com",
          to: to.filter(Boolean),
          subject,
          [bodyType === "html" ? "html" : "text"]: bodyText,
        });
        outputs = { messageId: result.messageId, sent: true };
        break;
      }

      case "variable": {
        const set = config.set as Record<string, unknown> | undefined;
        if (set) {
          for (const [key, value] of Object.entries(set)) {
            const resolved = resolveTemplate(value, ctx);
            ctx.variables.set(key, resolved);
          }
        }
        outputs = { vars: Object.fromEntries(ctx.variables) };
        break;
      }

      case "point_read": {
        const pointName = String(config.pointName ?? "");
        if (!pointName) {
          throw new Error("point_read node requires 'pointName'");
        }
        const values = await readPointValues([pointName]);
        outputs = {
          ...(dryRun ? { _dryRun: true } : {}),
          value: values[pointName],
          pointName,
          values,
        };
        break;
      }

      case "point_write": {
        const pointName = String(config.pointName ?? "");
        const valueKey = String(config.valueKey ?? "");
        if (!pointName) {
          throw new Error("point_write node requires 'pointName'");
        }
        if (!valueKey) {
          throw new Error("point_write node requires 'valueKey'");
        }
        const rawValue = resolveTemplate(config.value, ctx);
        if (dryRun) {
          outputs = {
            _dryRun: true,
            updated: true,
            pointName,
            valueKey,
            value: rawValue,
          };
          break;
        }
        await writePointValues([pointName], { [valueKey]: rawValue });
        outputs = {
          updated: true,
          pointName,
          valueKey,
          value: rawValue,
        };
        break;
      }

      default: {
        // Try plugin execution if registry is available
        if (registry) {
          try {
            const result = await executePluginNode(node, state, dsl, registry, dryRun);
            return result;
          } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes("not found")) {
              throw new Error(`Unknown node type: ${node.type}`);
            }
            throw err;
          }
        }
        throw new Error(`Unknown node type: ${node.type}`);
      }
    }

    log.status = "completed";
    log.completedAt = new Date().toISOString();
    log.durationMs = Date.now() - startTime;
    log.output = outputs;
    ctx.nodeOutputs.set(node.id, outputs);
    state.completed.add(node.id);
    return outputs;
  } catch (error) {
    log.status = "failed";
    log.completedAt = new Date().toISOString();
    log.durationMs = Date.now() - startTime;
    log.error = (error as Error).message;
    state.failed.add(node.id);

    // Handle onError
    if (node.onError) {
      const handler = node.onError;
      if (handler.action === "retry" && handler.retryCount && handler.retryCount > 0) {
        // Simple retry: reset and re-execute
        const retryNode = { ...node, onError: { ...handler, retryCount: handler.retryCount - 1 } };
        if (handler.retryDelayMs) {
          await sleep(handler.retryDelayMs);
        }
        return executeNode(retryNode, state, dsl, registry);
      }
      if (handler.action === "skip") {
        log.status = "skipped";
        return {};
      }
      if (handler.action === "goto" && handler.gotoNodeId) {
        return { __goto: handler.gotoNodeId };
      }
      // abort falls through to throw
    }

    throw error;
  }
}

async function executeSubGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  parentContext: ExecutionContext,
  registry: PluginRegistry | null,
  dryRun = false,
): Promise<Record<string, unknown>> {
  const startNode = nodes.find((n) => n.type === "start");
  if (!startNode) {
    return {};
  }

  // Create isolated context that shares variables with parent
  const subCtx: ExecutionContext = {
    triggerData: parentContext.triggerData,
    variables: parentContext.variables,
    nodeOutputs: new Map(),
    env: parentContext.env,
  };

  const state: InternalExecutionState = {
    context: subCtx,
    nodeLogs: [],
    completed: new Set(),
    failed: new Set(),
    workflowId: "subgraph",
    executionId: "subgraph",
  };

  const dsl: WorkflowDSL = {
    version: "1.0",
    trigger: { type: "manual", config: {} },
    nodes,
    edges,
  };
  await executeFromNode(startNode, state, dsl, registry, dryRun);

  // Collect end node outputs
  const endNodes = nodes.filter((n) => n.type === "end");
  if (endNodes.length > 0) {
    const lastEnd = endNodes[endNodes.length - 1]!;
    return subCtx.nodeOutputs.get(lastEnd.id) ?? {};
  }
  return {};
}

async function executeFromNode(
  startNode: WorkflowNode,
  state: InternalExecutionState,
  dsl: WorkflowDSL,
  registry: PluginRegistry | null,
  dryRun = false,
): Promise<void> {
  let currentNode: WorkflowNode | undefined = startNode;
  const visitedInPath = new Set<string>();

  while (currentNode) {
    // Prevent infinite loops in main graph (loop nodes use subGraph)
    if (visitedInPath.has(currentNode.id)) {
      break;
    }
    visitedInPath.add(currentNode.id);

    try {
      const outputs = await executeNode(currentNode, state, dsl, registry, dryRun);

      // Handle goto
      if (outputs.__goto && typeof outputs.__goto === "string") {
        const gotoNode = dsl.nodes.find((n) => n.id === outputs.__goto);
        currentNode = gotoNode;
        continue;
      }

      // Find next node
      const outgoing = getOutgoingEdges(currentNode.id, dsl.edges);

      if (currentNode.type === "condition") {
        const result = outputs.result as boolean;
        const edge = getEdgeByLabel(currentNode.id, result ? "true" : "false", dsl.edges);
        currentNode = edge ? dsl.nodes.find((n) => n.id === edge.target) : undefined;
      } else if (currentNode.type === "switch") {
        const matched = String(outputs.matched ?? "default");
        const edge =
          getEdgeByLabel(currentNode.id, matched, dsl.edges) ??
          getEdgeByLabel(currentNode.id, "default", dsl.edges);
        currentNode = edge ? dsl.nodes.find((n) => n.id === edge.target) : undefined;
      } else if (currentNode.type === "end") {
        currentNode = undefined;
      } else {
        // Single outgoing edge
        if (outgoing.length > 0) {
          currentNode = dsl.nodes.find((n) => n.id === outgoing[0]!.target);
        } else {
          currentNode = undefined;
        }
      }
    } catch {
      // Node failed and onError did not handle it - stop execution
      break;
    }
  }
}

export async function executeWorkflow(
  dsl: WorkflowDSL,
  triggerData: Record<string, unknown>,
  envVars: Record<string, string>,
  registry: PluginRegistry | null = null,
  dryRun = false,
  workflowId = "unknown",
  executionId = "unknown",
): Promise<ExecutionResult> {
  const ctx: ExecutionContext = {
    triggerData,
    variables: new Map(),
    nodeOutputs: new Map(),
    env: envVars,
  };

  const state: InternalExecutionState = {
    context: ctx,
    nodeLogs: [],
    completed: new Set(),
    failed: new Set(),
    workflowId,
    executionId,
  };

  const startNode = dsl.nodes.find((n) => n.type === "start");
  if (!startNode) {
    return {
      status: "failed",
      error: "Workflow has no 'start' node",
      nodeLogs: [],
      dryRun,
    };
  }

  try {
    await executeFromNode(startNode, state, dsl, registry, dryRun);

    const endNodes = dsl.nodes.filter((n) => n.type === "end");
    const lastEnd = endNodes.find((n) => state.completed.has(n.id));

    // Trim nodeLogs to 500 entries max
    const trimmedLogs = state.nodeLogs.slice(-500);

    return {
      status: "completed",
      output: lastEnd ? ctx.nodeOutputs.get(lastEnd.id) : undefined,
      nodeLogs: trimmedLogs,
      dryRun,
    };
  } catch (error) {
    return {
      status: "failed",
      error: (error as Error).message,
      nodeLogs: state.nodeLogs.slice(-500),
      dryRun,
    };
  }
}
