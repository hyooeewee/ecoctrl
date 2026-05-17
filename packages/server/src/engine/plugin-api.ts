import type { PluginApi, ExecutionContext } from "./plugin-types";
import { getLogger } from "@/lib/logger";

const logger = getLogger("plugin");

const ALLOWED_ENV_KEYS = ["API_BASE_URL", "NODE_ENV", "APP_NAME"];

export function createPluginApi(
  ctx: ExecutionContext,
  workflowId: string,
  executionId: string,
  nodeId: string,
  nodeName: string,
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
      readPoint: async () => {
        throw new Error("iot.readPoint not yet implemented");
      },
      readPoints: async () => {
        throw new Error("iot.readPoints not yet implemented");
      },
      writePoint: async () => {
        throw new Error("iot.writePoint not yet implemented");
      },
    },

    notify: {
      send: async () => {
        throw new Error("notify.send not yet implemented");
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
  };
}

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
