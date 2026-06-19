import type { ExecutionContext } from "./types";
import { evaluateExpression } from "./expr";

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Parse a path segment that may include bracket indices, e.g.:
 * - `points` -> { prop: "points", indices: [] }
 * - `arr[0]` -> { prop: "arr", indices: ["0"] }
 * - `points['C_5003_AV_0335']` -> { prop: "points", indices: ["'C_5003_AV_0335'"] }
 */
function parseSegment(segment: string): { prop: string; indices: string[] } {
  const match = segment.match(/^([^[]+)((?:\[[^\]]+\])+)$/);
  if (!match) return { prop: segment, indices: [] };
  const prop = match[1]!;
  const indices = Array.from(match[2].matchAll(/\[([^\]]+)\]/g)).map((m) => m[1]!);
  return { prop, indices };
}

function applyIndex(value: unknown, index: string): unknown {
  if (value == null) return undefined;
  const trimmed = index.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (quoted) {
    return (value as Record<string, unknown>)[trimmed.slice(1, -1)];
  }
  const n = Number(trimmed);
  if (!Number.isNaN(n) && Array.isArray(value)) {
    return value[n];
  }
  return (value as Record<string, unknown>)[trimmed];
}

function applyIndices(value: unknown, indices: string[]): unknown {
  let result = value;
  for (const index of indices) {
    result = applyIndex(result, index);
    if (result == null) return undefined;
  }
  return result;
}

function getValueFromPath(path: string, ctx: ExecutionContext): unknown {
  // var.VAR_NAME (workflow variables)
  if (path.startsWith("var.")) {
    return ctx.env[path.slice(4)] ?? "";
  }

  // secret.SECRET_NAME
  if (path.startsWith("secret.")) {
    return ctx.secrets[path.slice(7)] ?? "";
  }

  // now() or uuid()
  if (path === "now()") {
    return new Date().toISOString();
  }
  if (path === "uuid()") {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // trigger.key
  if (path.startsWith("trigger.")) {
    const keys = path.slice(8).split(".");
    let value: unknown = ctx.triggerData;
    for (const key of keys) {
      if (value == null) return "";
      const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const propName = arrayMatch[1]!;
        const index = parseInt(arrayMatch[2]!, 10);
        value = (value as Record<string, unknown>)[propName];
        if (Array.isArray(value)) {
          value = value[index];
        } else {
          return "";
        }
      } else {
        value = (value as Record<string, unknown>)[key];
      }
    }
    return value ?? "";
  }

  // vars.varName
  if (path.startsWith("vars.")) {
    return ctx.variables.get(path.slice(5)) ?? "";
  }

  // nodeId.outputKey (default namespace)
  const parts = path.split(".");
  if (parts.length >= 2) {
    const nodeId = parts[0];
    const outputs = ctx.nodeOutputs.get(nodeId);
    if (outputs) {
      const { prop: outputKey, indices } = parseSegment(parts[1]!);
      let value: unknown = outputs[outputKey];
      value = applyIndices(value, indices);
      // Deep path: nodeId.outputKey.subKey or nodeId.outputKey.arr[0].subKey
      for (let i = 2; i < parts.length; i++) {
        if (value == null) return "";
        const { prop, indices: restIndices } = parseSegment(parts[i]!);
        value = (value as Record<string, unknown>)[prop];
        value = applyIndices(value, restIndices);
      }
      return value ?? "";
    }
  }

  return "";
}

export function resolveTemplate(value: unknown, ctx: ExecutionContext): unknown {
  if (typeof value === "string") {
    // Full template: "{{expr}}"
    const fullMatch = value.match(/^\{\{(.+)\}\}$/);
    if (fullMatch) {
      const inner = fullMatch[1]!.trim();
      // If it looks like an expression (operators surrounded by spaces), evaluate it
      if (/ (?:[+\-*/%><=!&|?:]) /.test(inner)) {
        const vars: Record<string, unknown> = {};
        ctx.variables.forEach((v, k) => {
          vars[k] = v;
        });
        ctx.nodeOutputs.forEach((v, k) => {
          vars[k] = v;
        });
        vars.trigger = ctx.triggerData;
        return evaluateExpression(inner, vars);
      }
      return getValueFromPath(inner, ctx);
    }

    // Mixed template: "hello {{name}}"
    return value.replace(TEMPLATE_REGEX, (_match, path: string) => {
      const result = getValueFromPath(path.trim(), ctx);
      return result == null ? "" : String(result);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplate(item, ctx));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveTemplate(v, ctx);
    }
    return result;
  }

  return value;
}

export function buildVars(ctx: ExecutionContext): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  ctx.variables.forEach((v, k) => {
    vars[k] = v;
  });
  ctx.nodeOutputs.forEach((v, k) => {
    vars[k] = v;
  });
  vars.trigger = ctx.triggerData;
  return vars;
}
