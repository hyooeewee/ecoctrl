import jsep from "jsep";

const ALLOWED_NODE_TYPES = new Set([
  "BinaryExpression",
  "UnaryExpression",
  "MemberExpression",
  "Identifier",
  "Literal",
  "ConditionalExpression",
  "ArrayExpression",
  "CallExpression",
]);

const ALLOWED_UNARY_OPS = new Set(["!", "-", "+"]);
const ALLOWED_BINARY_OPS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  ">",
  "<",
  ">=",
  "<=",
  "==",
  "===",
  "!=",
  "!==",
  "&&",
  "||",
]);
const ALLOWED_FUNCTIONS = new Set([
  "now",
  "uuid",
  "parseInt",
  "parseFloat",
  "String",
  "Number",
  "Boolean",
  "map",
]);

// Safe methods that can be called on primitive objects
const SAFE_METHODS = new Set([
  "toString",
  "toFixed",
  "toPrecision",
  "toLowerCase",
  "toUpperCase",
  "trim",
  "slice",
  "substring",
  "split",
  "replace",
  "match",
  "padStart",
  "padEnd",
  "includes",
  "startsWith",
  "endsWith",
  "charAt",
  "indexOf",
  "lastIndexOf",
  "concat",
  "repeat",
  "round",
  "floor",
  "ceil",
  "abs",
  "pow",
  "sqrt",
]);

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return 0;
}

function validateAst(node: jsep.Expression | null): void {
  if (!node) return;
  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    throw new Error(`Forbidden expression type: ${node.type}`);
  }

  if (node.type === "CallExpression") {
    const call = node as jsep.CallExpression;
    if (call.callee.type === "Identifier") {
      const name = (call.callee as jsep.Identifier).name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new Error(`Forbidden function: ${name}`);
      }
    } else if (call.callee.type === "MemberExpression") {
      // Method calls are validated at evaluation time via SAFE_METHODS
      validateAst(call.callee);
    } else {
      throw new Error("Only direct function calls or method calls are allowed");
    }
  }

  if (node.type === "UnaryExpression") {
    const op = (node as jsep.UnaryExpression).operator;
    if (!ALLOWED_UNARY_OPS.has(op)) {
      throw new Error(`Forbidden unary operator: ${op}`);
    }
  }

  if (node.type === "BinaryExpression") {
    const op = (node as jsep.BinaryExpression).operator;
    if (!ALLOWED_BINARY_OPS.has(op)) {
      throw new Error(`Forbidden binary operator: ${op}`);
    }
  }

  // Recursively validate children
  for (const key of Object.keys(node)) {
    const value = (node as Record<string, unknown>)[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === "object") {
            validateAst(item as jsep.Expression);
          }
        }
      } else {
        validateAst(value as jsep.Expression);
      }
    }
  }
}

function evaluateNode(node: jsep.Expression, vars: Record<string, unknown>): unknown {
  switch (node.type) {
    case "Literal":
      return (node as jsep.Literal).value;

    case "Identifier": {
      const name = (node as jsep.Identifier).name;
      return vars[name];
    }

    case "UnaryExpression": {
      const { operator, argument } = node as jsep.UnaryExpression;
      const val = evaluateNode(argument, vars);
      if (operator === "!") return !val;
      if (operator === "-") return -(val as number);
      if (operator === "+") return +(val as number);
      throw new Error(`Unknown unary operator: ${operator}`);
    }

    case "BinaryExpression": {
      const { operator, left, right } = node as jsep.BinaryExpression;
      const l = evaluateNode(left, vars);
      const r = evaluateNode(right, vars);
      switch (operator) {
        case "+":
          return (l as number) + (r as number);
        case "-":
          return toNumber(l) - toNumber(r);
        case "*":
          return toNumber(l) * toNumber(r);
        case "/":
          return toNumber(l) / toNumber(r);
        case "%":
          return toNumber(l) % toNumber(r);
        case ">":
          return toNumber(l) > toNumber(r);
        case "<":
          return toNumber(l) < toNumber(r);
        case ">=":
          return toNumber(l) >= toNumber(r);
        case "<=":
          return toNumber(l) <= toNumber(r);
        case "==":
          return l == r;
        case "===":
          return l === r;
        case "!=":
          return l != r;
        case "!==":
          return l !== r;
        case "&&":
          return l && r;
        case "||":
          return l || r;
        default:
          throw new Error(`Unknown binary operator: ${operator}`);
      }
    }

    case "ConditionalExpression": {
      const { test, consequent, alternate } = node as jsep.ConditionalExpression;
      const cond = evaluateNode(test, vars);
      return cond ? evaluateNode(consequent, vars) : evaluateNode(alternate, vars);
    }

    case "MemberExpression": {
      const { object, property, computed } = node as jsep.MemberExpression;
      const obj = evaluateNode(object, vars);
      const prop = computed ? evaluateNode(property, vars) : (property as jsep.Identifier).name;
      if (obj == null) return undefined;
      return (obj as Record<string, unknown>)[prop as string];
    }

    case "ArrayExpression": {
      const { elements } = node as jsep.ArrayExpression;
      return elements.map((el) => evaluateNode(el!, vars));
    }

    case "CallExpression": {
      const { callee, arguments: args } = node as jsep.CallExpression;

      let obj: unknown;
      let methodName: string;

      if (callee.type === "MemberExpression") {
        const member = callee as jsep.MemberExpression;
        obj = evaluateNode(member.object, vars);
        methodName = member.computed
          ? String(evaluateNode(member.property, vars))
          : (member.property as jsep.Identifier).name;
      } else if (callee.type === "Identifier") {
        obj = undefined;
        methodName = (callee as jsep.Identifier).name;
      } else {
        throw new Error(`Unsupported callee type: ${callee.type}`);
      }

      const evaluatedArgs = args.map((arg) => evaluateNode(arg, vars));

      if (obj !== undefined) {
        // Method call
        if (!SAFE_METHODS.has(methodName)) {
          throw new Error(`Forbidden method: ${methodName}`);
        }
        const fn = (obj as Record<string, unknown>)[methodName];
        if (typeof fn === "function") {
          return (fn as (...args: unknown[]) => unknown).apply(obj, evaluatedArgs);
        }
        throw new Error(`Not a function: ${methodName}`);
      }

      // Direct function call
      switch (methodName) {
        case "now":
          return new Date().toISOString();
        case "uuid": {
          // Simple UUID v4
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }
        case "parseInt":
          return Number.parseInt(evaluatedArgs[0] as string, (evaluatedArgs[1] as number) ?? 10);
        case "parseFloat":
          return Number.parseFloat(evaluatedArgs[0] as string);
        case "String":
          return String(evaluatedArgs[0]);
        case "Number":
          return Number(evaluatedArgs[0]);
        case "Boolean":
          return Boolean(evaluatedArgs[0]);
        case "map": {
          // map(array, keyField, valueField) - convert array to {key: value} object
          const arr = evaluatedArgs[0];
          const keyField = evaluatedArgs[1] as string;
          const valueField = evaluatedArgs[2] as string;
          if (!Array.isArray(arr)) return {};
          const mapped: Record<string, unknown> = {};
          for (const item of arr) {
            if (item != null && typeof item === "object") {
              const key = (item as Record<string, unknown>)[keyField];
              if (key != null) {
                mapped[String(key)] = (item as Record<string, unknown>)[valueField];
              }
            }
          }
          return mapped;
        }
        default:
          throw new Error(`Unknown function: ${methodName}`);
      }
    }

    default:
      throw new Error(`Cannot evaluate node type: ${node.type}`);
  }
}

export function evaluateExpression(expression: string, vars: Record<string, unknown>): unknown {
  const ast = jsep(expression);
  validateAst(ast);
  return evaluateNode(ast, vars);
}

export function evaluateBoolean(expression: string, vars: Record<string, unknown>): boolean {
  const result = evaluateExpression(expression, vars);
  return Boolean(result);
}
