import type { PluginApi, ExecutionContext } from "./plugin-types";
import { getLogger } from "@/lib/logger";
import {
  readPointValues,
  writePointValues,
  readPointHistory,
  forceWritePointValues,
  getAlarmConfigurations,
  getHistoricalAlarms,
  readPointProperties,
} from "@/services/iot/points";
import { evaluateExpression, evaluateBoolean } from "./expr";
import { buildVars } from "./template";
import { createTransport } from "nodemailer";
import { db } from "@/config/database";
import { sql } from "drizzle-orm";
import type { PluginRegistry } from "./plugin-registry";
import { executeSubGraph } from "./sub-graph";
import { emitEvent } from "@/lib/notifyTrigger";

const logger = getLogger("plugin");

const ALLOWED_ENV_KEYS = ["API_BASE_URL", "NODE_ENV", "APP_NAME"];

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
      writePoint: async (name: string, value: unknown) => {
        await writePointValues([{ pointId: name, value }]);
      },
      writePoints: async (points: Array<{ pointId: string; value: unknown }>) => {
        await writePointValues(points);
      },
      forceWritePoint: async (name: string, value: unknown) => {
        await forceWritePointValues([{ pointId: name, value }]);
      },
      readPointHistory: async (
        name: string,
        beginTime: string,
        endTime: string,
        interval?: number,
      ) => {
        return readPointHistory([name], beginTime, endTime, interval);
      },
      readPointProp: async (name: string, prop?: string) => {
        const values = await readPointProperties([name], prop);
        return values[name];
      },
      getAlarmConfigurations: async () => {
        return getAlarmConfigurations();
      },
      getHistoricalAlarms: async (beginTime: string, endTime: string) => {
        return getHistoricalAlarms(beginTime, endTime);
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
        from?: string;
        cc?: string;
        bcc?: string;
        replyTo?: string;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPass?: string;
        smtpSecure?: boolean;
      }) => {
        const missing: string[] = [];
        if (!options.smtpHost) missing.push("smtpHost");
        if (options.smtpPort === undefined) missing.push("smtpPort");
        if (!options.smtpUser) missing.push("smtpUser");
        if (!options.smtpPass) missing.push("smtpPass");
        if (missing.length > 0) {
          throw new Error(
            `邮件节点缺少必需的 SMTP 配置: ${missing.join(", ")}。请在节点配置中填写完整的 SMTP 服务器信息。`,
          );
        }

        const transport = createTransport({
          host: options.smtpHost,
          port: options.smtpPort,
          secure: options.smtpSecure ?? options.smtpPort === 465,
          auth: { user: options.smtpUser, pass: options.smtpPass },
        });

        try {
          await transport.verify();
          logger.info(
            `[SMTP] Transport verified OK for ${options.smtpHost}:${options.smtpPort} (user=${options.smtpUser})`,
          );
        } catch (verifyErr) {
          const err = verifyErr as Error & { code?: string; command?: string };
          logger.error(
            `[SMTP] Transport verify failed for ${options.smtpHost}:${options.smtpPort}: ${err.message} (code=${err.code})`,
          );
          if (err.code === "ETIMEDOUT" || err.message.includes("Timeout")) {
            throw new Error(
              `SMTP 连接超时 (${options.smtpHost}:${options.smtpPort})。请检查: 1) 主机/端口是否正确 2) 防火墙是否允许出站 3) 163/QQ 邮箱需使用授权码而非登录密码 4) 465 端口需 SSL, 587 端口需 STARTTLS`,
              { cause: verifyErr },
            );
          }
          if (err.message.includes("Invalid login") || err.message.includes("AUTH")) {
            throw new Error(
              `SMTP 认证失败 (${options.smtpUser})。163/QQ 等邮箱请使用"授权码"代替登录密码。`,
              { cause: verifyErr },
            );
          }
          throw new Error(`SMTP 连接验证失败: ${err.message}`, { cause: verifyErr });
        }

        const senderFrom = options.from || options.smtpUser;
        const bodyType = options.bodyType || "text";
        const mailOptions: Record<string, unknown> = {
          from: senderFrom,
          to: options.to.filter(Boolean),
          subject: options.subject,
          [bodyType === "html" ? "html" : "text"]: options.body,
        };
        if (options.cc) mailOptions.cc = options.cc;
        if (options.bcc) mailOptions.bcc = options.bcc;
        if (options.replyTo) mailOptions.replyTo = options.replyTo;

        const recipients = options.to.filter(Boolean).join(", ");
        logger.info(
          `[SMTP] Sending mail from=${senderFrom} to=[${recipients}] subject="${options.subject}" bodyType=${bodyType} cc=${options.cc || "-"} bcc=${options.bcc || "-"} via ${options.smtpHost}:${options.smtpPort}`,
        );

        try {
          const result = await transport.sendMail(mailOptions);
          logger.info(
            `[SMTP] Mail sent successfully: messageId=${result.messageId}, accepted=${result.accepted?.length ?? 0}, rejected=${result.rejected?.length ?? 0}, response="${result.response}"`,
          );
          return {
            messageId: result.messageId,
            sent: true,
            accepted: result.accepted,
            rejected: result.rejected,
            response: result.response,
          };
        } catch (sendErr) {
          const err = sendErr as Error & {
            code?: string;
            command?: string;
            responseCode?: number;
          };
          logger.error(
            `[SMTP] Mail send failed: ${err.message} (code=${err.code}, responseCode=${err.responseCode}, command=${err.command})`,
          );
          throw new Error(`邮件发送失败: ${err.message}`, { cause: sendErr });
        }
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
        const vars = buildVars(ctx);
        return evaluateBoolean(expression, vars);
      },
      evaluateExpression: (expression: string) => {
        const vars = buildVars(ctx);
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
    const hasBody = ["post", "put", "patch"].includes(method.toLowerCase());
    let fetchBody: string | undefined =
      options?.body && typeof options.body === "object"
        ? JSON.stringify(options.body)
        : (options?.body as string | undefined);

    // When Content-Type is application/json but body is empty, send empty JSON object
    const contentType = options?.headers?.["Content-Type"] ?? options?.headers?.["content-type"];
    if (hasBody && !fetchBody && contentType?.includes("application/json")) {
      fetchBody = "{}";
    }

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
