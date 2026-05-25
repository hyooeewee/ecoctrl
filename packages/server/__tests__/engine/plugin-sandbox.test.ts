import { describe, it, expect } from "vitest";
import { executeInSandbox } from "@/engine/plugin-sandbox";
import type { PluginApi } from "@/engine/plugin-types";

function createMockApi(): PluginApi {
  const store = new Map<string, unknown>();
  return {
    variables: {
      get: (key: string) => store.get(key),
      set: (key: string, value: unknown) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      all: () => Object.fromEntries(store),
    },
    http: {
      get: async () => ({ status: 200, body: "", json: () => ({}) }),
      post: async () => ({ status: 200, body: "", json: () => ({}) }),
      put: async () => ({ status: 200, body: "", json: () => ({}) }),
      patch: async () => ({ status: 200, body: "", json: () => ({}) }),
      delete: async () => ({ status: 200, body: "", json: () => ({}) }),
    },
    iot: { readPoint: async () => ({}), readPoints: async () => ({}), writePoint: async () => {} },
    notify: { send: async () => {}, sendMail: async () => ({ messageId: "test", sent: true }) },
    log: { info: () => {}, warn: () => {}, error: () => {} },
    env: { get: () => undefined },
    context: { workflowId: "", executionId: "", triggerData: {}, nodeId: "", nodeName: "" },
    utils: { sleep: async () => {} },
    expr: { evaluateBoolean: () => false, evaluateExpression: () => null },
    db: { execute: async () => ({}) },
    workflow: { executeSubGraph: async () => ({}) },
  };
}

describe("executeInSandbox", () => {
  it("executes simple plugin code", async () => {
    const code = `module.exports = async function execute(ctx, api) { return { result: ctx.config.value * 2 }; };`;
    const ctx = {
      config: { value: 21 },
      variables: new Map(),
      triggerData: {},
      workflowId: "wf-1",
      executionId: "ex-1",
      nodeId: "node-1",
      nodeName: "test",
    };
    const api = createMockApi();
    const result = await executeInSandbox(code, ctx, api);
    expect(result).toEqual({ result: 42 });
  });

  it("throws on infinite loop", async () => {
    const code = `module.exports = async function execute(ctx, api) { while(true) {} };`;
    const api = createMockApi();
    await expect(executeInSandbox(code, {}, api)).rejects.toThrow();
  }, 35_000);

  it("throws when module.exports is not a function", async () => {
    const code = `module.exports = 42;`;
    const api = createMockApi();
    await expect(executeInSandbox(code, {}, api)).rejects.toThrow("must export a function");
  });

  it("exposes api.variables correctly", async () => {
    const code = `
      module.exports = async function execute(ctx, api) {
        api.variables.set('testKey', 'testValue');
        const value = api.variables.get('testKey');
        return { value };
      };
    `;
    const api = createMockApi();
    const result = await executeInSandbox(code, {}, api);
    expect(result).toEqual({ value: "testValue" });
  });

  it("exposes api.context correctly", async () => {
    const code = `
      module.exports = async function execute(ctx, api) {
        return { nodeId: api.context.nodeId, workflowId: api.context.workflowId };
      };
    `;
    const api: PluginApi = {
      ...createMockApi(),
      context: {
        workflowId: "wf-test",
        executionId: "ex-test",
        triggerData: {},
        nodeId: "node-42",
        nodeName: "TestNode",
      },
    };
    const result = await executeInSandbox(code, {}, api);
    expect(result).toEqual({ nodeId: "node-42", workflowId: "wf-test" });
  });
});
