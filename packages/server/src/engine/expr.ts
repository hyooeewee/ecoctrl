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
const ALLOWED_FUNCTIONS = new Set(["now", "uuid", "parseInt", "parseFloat"]);

function validateAst(node: jsep.Expression | null): void {
  if (!node) return;
  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    throw new Error(`Forbidden expression type: ${node.type}`);
  }

  if (node.type === "CallExpression") {
    const call = node as jsep.CallExpression;
    if (call.callee.type !== "Identifier") {
      throw new Error("Only direct function calls are allowed");
    }
    const name = (call.callee as jsep.Identifier).name;
    if (!ALLOWED_FUNCTIONS.has(name)) {
      throw new Error(`Forbidden function: ${name}`);
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
          return (l as number) - (r as number);
        case "*":
          return (l as number) * (r as number);
        case "/":
          return (l as number) / (r as number);
        case "%":
          return (l as number) % (r as number);
        case ">":
          return (l as number) > (r as number);
        case "<":
          return (l as number) < (r as number);
        case ">=":
          return (l as number) >= (r as number);
        case "<=":
          return (l as number) <= (r as number);
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
      const name = (callee as jsep.Identifier).name;
      const evaluatedArgs = args.map((arg) => evaluateNode(arg, vars));
      switch (name) {
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
        default:
          throw new Error(`Unknown function: ${name}`);
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
