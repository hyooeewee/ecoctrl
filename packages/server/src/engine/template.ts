import type { ExecutionContext } from "./types";
import { evaluateExpression } from "./expr";

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

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
      value = (value as Record<string, unknown>)[key];
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
    const outputKey = parts[1];
    const outputs = ctx.nodeOutputs.get(nodeId);
    if (outputs) {
      let value: unknown = outputs[outputKey];
      // Deep path: nodeId.outputKey.subKey
      for (let i = 2; i < parts.length; i++) {
        if (value == null) return "";
        value = (value as Record<string, unknown>)[parts[i]!];
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
