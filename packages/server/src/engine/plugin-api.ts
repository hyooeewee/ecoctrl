import type { PluginApi, ExecutionContext } from "./plugin-types";
import { getLogger } from "@/lib/logger";
import { readPointValues, writePointValues } from "@/services/iot/points";
import { evaluateExpression, evaluateBoolean } from "./expr";
import { createTransport } from "nodemailer";
import { findPlatformConfig } from "@/repositories/platformConfig";
import { db } from "@/config/database";
import { sql } from "drizzle-orm";
import type { PluginRegistry } from "./plugin-registry";
import { executeSubGraph } from "./sub-graph";
import { emitEvent } from "@/lib/notifyTrigger";

const logger = getLogger("plugin");

const ALLOWED_ENV_KEYS = ["API_BASE_URL", "NODE_ENV", "APP_NAME"];

// SMTP transport cache (moved from executor.ts)
let smtpTransport: ReturnType<typeof createTransport> | null = null;
let smtpConfigTime = 0;

async function getSmtpTransport() {
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

export function createPluginApi(
  ctx: ExecutionContext,
  workflowId: string,
  executionId: string,
  nodeId: string,
  nodeName: string,
  registry: PluginRegistry | null,
  dryRun: boolean,
): PluginApi {
  return {
    variables: {
      get: (key: string) => ctx.variables.get(key),
      set: (key: string, value: unknown) => ctx.variables.set(key, value),
      delete: (key: string) => ctx.variables.delete(key),
      all: () => Object.fromEntries(ctx.variables),
    },

    http: {
      get: async (url, options) => safeHttp("GET", url, options),
      post: async (url, options) => safeHttp("POST", url, options),
      put: async (url, options) => safeHttp("PUT", url, options),
      patch: async (url, options) => safeHttp("PATCH", url, options),
      delete: async (url, options) => safeHttp("DELETE", url, options),
    },

    iot: {
      readPoint: async (name: string) => {
        const values = await readPointValues([name]);
        return values[name];
      },
      readPoints: async (names: string[]) => {
        return readPointValues(names);
      },
      writePoint: async (name: string, values: Record<string, unknown>) => {
        await writePointValues([name], values);
      },
    },

    notify: {
      send: async (options: {
        title: string;
        content: string;
        level?: "info" | "warning" | "error";
        to?: string[];
      }) => {
        const payload: Record<string, unknown> = {
          title: options.title,
          content: options.content,
          level: options.level ?? "info",
        };
        if (options.to && options.to.length > 0) {
          payload._targetUserId = options.to[0];
        }
        await emitEvent("notification", payload);
      },
      sendMail: async (options: {
        to: string[];
        subject: string;
        body: string;
        bodyType?: string;
      }) => {
        const transport = await getSmtpTransport();
        if (!transport) {
          throw new Error("SMTP not configured");
        }
        const bodyType = options.bodyType || "text";
        const result = await transport.sendMail({
          from: "noreply@ecoctrl.com",
          to: options.to.filter(Boolean),
          subject: options.subject,
          [bodyType === "html" ? "html" : "text"]: options.body,
        });
        return { messageId: result.messageId, sent: true };
      },
    },

    log: {
      info: (msg, meta) => {
        if (meta) logger.info(meta, `[plugin:${nodeId}] ${msg}`);
        else logger.info(`[plugin:${nodeId}] ${msg}`);
      },
      warn: (msg, meta) => {
        if (meta) logger.warn(meta, `[plugin:${nodeId}] ${msg}`);
        else logger.warn(`[plugin:${nodeId}] ${msg}`);
      },
      error: (msg, meta) => {
        if (meta) logger.error(meta, `[plugin:${nodeId}] ${msg}`);
        else logger.error(`[plugin:${nodeId}] ${msg}`);
      },
    },

    env: {
      get: (key: string) => {
        if (ALLOWED_ENV_KEYS.includes(key)) {
          return process.env[key];
        }
        return undefined;
      },
    },

    context: {
      workflowId,
      executionId,
      triggerData: ctx.triggerData,
      nodeId,
      nodeName,
    },

    utils: {
      sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
    },

    expr: {
      evaluateBoolean: (expression: string) => {
        const vars = Object.fromEntries(ctx.variables);
        return evaluateBoolean(expression, vars);
      },
      evaluateExpression: (expression: string) => {
        const vars = Object.fromEntries(ctx.variables);
        return evaluateExpression(expression, vars);
      },
    },

    db: {
      execute: async (
        operation: string,
        table: string,
        where?: Record<string, unknown>,
        data?: Record<string, unknown>,
        returning?: string[],
      ) => {
        const allowedTables = new Set([
          "objects",
          "energy_readings",
          "alert_logs",
          "workflow_executions",
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
            return { rows: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`SELECT ${retCols} FROM ${tableId}`;
            const result = await db.execute(query);
            return { rows: result as unknown[], count: (result as unknown[]).length };
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
          return { inserted: result as unknown[], count: (result as unknown[]).length };
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
            return { updated: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`UPDATE ${tableId} SET ${setSql}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            return { updated: result as unknown[], count: (result as unknown[]).length };
          }
        } else if (operation === "delete") {
          if (where && Object.keys(where).length > 0) {
            const conditions = Object.entries(where).map(
              ([k, v]) => sql`${sql.identifier(k)} = ${v}`,
            );
            const whereSql = sql.join(conditions, sql` AND `);
            const query = sql`DELETE FROM ${tableId} WHERE ${whereSql}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            return { deleted: result as unknown[], count: (result as unknown[]).length };
          } else {
            const query = sql`DELETE FROM ${tableId}${returning ? sql.raw(` RETURNING ${returning.join(", ")}`) : sql.raw("")}`;
            const result = await db.execute(query);
            return { deleted: result as unknown[], count: (result as unknown[]).length };
          }
        }
        throw new Error(`Unsupported database operation: ${operation}`);
      },
    },

    workflow: {
      executeSubGraph: async (nodes: unknown[], edges: unknown[]) => {
        if (!registry) {
          throw new Error("Registry not available for sub-graph execution");
        }
        return executeSubGraph(
          nodes as import("./types").WorkflowNode[],
          edges as import("./types").WorkflowEdge[],
          ctx,
          registry,
          dryRun,
        );
      },
    },
  };
}

// safeHttp function remains unchanged
async function safeHttp(
  method: string,
  url: string,
  options?: { headers?: Record<string, string>; body?: string | object; timeout?: number },
): Promise<{ status: number; body: string; json(): unknown }> {
  // Validate URL (no internal addresses)
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  if (isInternalHost(hostname)) {
    throw new Error("HTTP requests to internal addresses are not allowed");
  }

  const timeout = Math.min(options?.timeout ?? 10_000, 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchBody: string | undefined =
      options?.body && typeof options.body === "object"
        ? JSON.stringify(options.body)
        : (options?.body as string | undefined);
    const response = await fetch(url, {
      method,
      headers: options?.headers,
      body: fetchBody,
      signal: controller.signal,
      redirect: "error",
    });
    clearTimeout(timer);
    const body = await response.text();
    return {
      status: response.status,
      body,
      json: () => {
        try {
          return JSON.parse(body);
        } catch {
          return body;
        }
      },
    };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function isInternalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "0.0.0.0") return true;

  // IPv4
  if (lower === "127.0.0.1") return true;
  if (lower.startsWith("127.")) return true;
  if (lower.startsWith("10.")) return true;
  if (lower.startsWith("192.168.")) return true;
  if (lower.startsWith("172.")) {
    const second = parseInt(lower.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (lower.startsWith("169.254.")) return true;

  // IPv6
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("fe80:")) return true;

  return false;
}
