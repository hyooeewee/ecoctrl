import ivm from "isolated-vm";
import type { PluginApi } from "./plugin-types";

export async function executeInSandbox(
  code: string,
  ctx: Record<string, unknown>,
  api: PluginApi,
): Promise<Record<string, unknown>> {
  const isolate = new ivm.Isolate({ memoryLimit: 64 });
  const context = await isolate.createContext();

  // Generate random prefix for internal globals to avoid leakage
  const prefix = `__${Math.random().toString(36).slice(2)}_`;
  const resolveName = `${prefix}resolve`;
  const rejectName = `${prefix}reject`;

  try {
    // Inject ctx as a copyable object
    const ctxCopy = new ivm.ExternalCopy(ctx);
    await context.global.set("__ctx", ctxCopy.copyInto());

    // Inject api as callable references using evalClosure
    await injectApi(context, api);

    // Set up a callback to receive the result
    let capturedResult: unknown = null;
    let capturedError: Error | null = null;
    await context.evalClosure(
      `globalThis.${resolveName} = function(value) {
        return $0.applySync(undefined, [value], { arguments: { copy: true } });
      }`,
      [
        (value: unknown) => {
          capturedResult = value;
        },
      ],
      { arguments: { reference: true } },
    );
    await context.evalClosure(
      `globalThis.${rejectName} = function(err) {
        return $0.applySync(undefined, [err], { arguments: { copy: true } });
      }`,
      [
        (err: Error) => {
          capturedError = err;
        },
      ],
      { arguments: { reference: true } },
    );

    // Wrap user code - execute inside the isolate and capture result via callback
    const wrappedCode = `
      (async function() {
        try {
          var module = { exports: {} };
          var exports = module.exports;
          ${code}
          if (typeof module.exports !== 'function') {
            throw new Error('backend.js must export a function');
          }
          var __result = await module.exports(__ctx, __api);
          ${resolveName}(__result);
        } catch (err) {
          ${rejectName}(err.message || String(err));
        }
      })();
    `;

    const script = await isolate.compileScript(wrappedCode);
    await script.run(context, { timeout: 30_000 });

    // Wait for the async callback to be invoked
    // Use a polling approach with timeout
    const startTime = Date.now();
    const maxWait = 35_000; // Slightly longer than script timeout
    while (capturedResult === null && capturedError === null) {
      if (Date.now() - startTime > maxWait) {
        throw new Error("Plugin execution timed out");
      }
      await sleep(10);
    }

    if (capturedError) {
      throw new Error((capturedError as Error).message || String(capturedError));
    }

    return (capturedResult ?? {}) as Record<string, unknown>;
  } finally {
    // Clean up internal globals to prevent leakage between executions
    try {
      await context.eval(
        `delete globalThis.${resolveName}; delete globalThis.${rejectName}; delete globalThis.__ctx; delete globalThis.__api;`,
      );
    } catch {
      // Ignore cleanup errors
    }
    isolate.dispose();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function injectApi(context: ivm.Context, api: PluginApi): Promise<void> {
  // Use evalClosure to inject host functions into the isolate

  // Variables - use applySync with copy back for return values
  await context.evalClosure(
    `globalThis.__variables_get = function(key) { return $0.applySync(undefined, [key], { result: { copy: true } }); }`,
    [(key: string) => api.variables.get(key)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__variables_set = function(key, value) { return $0.applySync(undefined, [key, value], { arguments: { copy: true }, result: { copy: true } }); }`,
    [(key: string, value: unknown) => api.variables.set(key, value)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__variables_delete = function(key) { return $0.applySync(undefined, [key], { result: { copy: true } }); }`,
    [(key: string) => api.variables.delete(key)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__variables_all = function() { return $0.applySync(undefined, [], { result: { copy: true } }); }`,
    [() => api.variables.all()],
    { arguments: { reference: true } },
  );

  // HTTP - async methods need apply with copy back
  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    await context.evalClosure(
      `globalThis.__http_${method} = async function(url, options) {
        return await $0.apply(undefined, [url, options], { arguments: { copy: true }, result: { copy: true, promise: true } });
      }`,
      [
        async (url: string, options?: unknown) => {
          const result = await api.http[method](
            url,
            options as {
              headers?: Record<string, string>;
              body?: string | object;
              timeout?: number;
            },
          );
          return result;
        },
      ],
      { arguments: { reference: true } },
    );
  }

  // Log
  await context.evalClosure(
    `globalThis.__log_info = function(msg, meta) { return $0.applySync(undefined, [msg, meta], { arguments: { copy: true } }); }`,
    [(msg: string, meta?: Record<string, unknown>) => api.log.info(msg, meta)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__log_warn = function(msg, meta) { return $0.applySync(undefined, [msg, meta], { arguments: { copy: true } }); }`,
    [(msg: string, meta?: Record<string, unknown>) => api.log.warn(msg, meta)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__log_error = function(msg, meta) { return $0.applySync(undefined, [msg, meta], { arguments: { copy: true } }); }`,
    [(msg: string, meta?: Record<string, unknown>) => api.log.error(msg, meta)],
    { arguments: { reference: true } },
  );

  // Context (static data, can use ExternalCopy)
  const contextCopy = new ivm.ExternalCopy({
    workflowId: api.context.workflowId,
    executionId: api.context.executionId,
    triggerData: api.context.triggerData,
    nodeId: api.context.nodeId,
    nodeName: api.context.nodeName,
  });
  await context.global.set("__context_data", contextCopy.copyInto());

  // IoT (all methods are async)
  await context.evalClosure(
    `globalThis.__iot_readPoint = async function(name) {
      return await $0.apply(undefined, [name], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [(name: string) => api.iot.readPoint(name)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__iot_readPoints = async function(names) {
      return await $0.apply(undefined, [names], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [(names: string[]) => api.iot.readPoints(names)],
    { arguments: { reference: true } },
  );
  await context.evalClosure(
    `globalThis.__iot_writePoint = async function(name, values) {
      return await $0.apply(undefined, [name, values], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [(name: string, values: Record<string, unknown>) => api.iot.writePoint(name, values)],
    { arguments: { reference: true } },
  );

  // Notify
  await context.evalClosure(
    `globalThis.__notify_send = function(options) { return $0.applySync(undefined, [options], { arguments: { copy: true } }); }`,
    [
      (options: {
        title: string;
        content: string;
        level?: "info" | "warning" | "error";
        to?: string[];
      }) => api.notify.send(options),
    ],
    { arguments: { reference: true } },
  );

  // Env
  await context.evalClosure(
    `globalThis.__env_get = function(key) { return $0.applySync(undefined, [key], { result: { copy: true } }); }`,
    [(key: string) => api.env.get(key)],
    { arguments: { reference: true } },
  );

  // Inject utils.sleep
  await context.evalClosure(
    `globalThis.__utils_sleep = function(ms) { return $0.applySync(undefined, [ms], { arguments: { copy: true }, result: { copy: true, promise: true } }); }`,
    [(ms: number) => api.utils.sleep(ms)],
    { arguments: { reference: true } },
  );

  // Inject expr.evaluateBoolean
  await context.evalClosure(
    `globalThis.__expr_evaluateBoolean = function(expression) { return $0.applySync(undefined, [expression], { arguments: { copy: true }, result: { copy: true } }); }`,
    [(expression: string) => api.expr.evaluateBoolean(expression)],
    { arguments: { reference: true } },
  );

  // Inject expr.evaluateExpression
  await context.evalClosure(
    `globalThis.__expr_evaluateExpression = function(expression) { return $0.applySync(undefined, [expression], { arguments: { copy: true }, result: { copy: true } }); }`,
    [(expression: string) => api.expr.evaluateExpression(expression)],
    { arguments: { reference: true } },
  );

  // Inject db.execute (async)
  await context.evalClosure(
    `globalThis.__db_execute = async function(operation, table, where, data, returning) {
      return await $0.apply(undefined, [operation, table, where, data, returning], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [
      async (
        operation: string,
        table: string,
        where?: Record<string, unknown>,
        data?: Record<string, unknown>,
        returning?: string[],
      ) => api.db.execute(operation, table, where, data, returning),
    ],
    { arguments: { reference: true } },
  );

  // Inject notify.sendMail (async)
  await context.evalClosure(
    `globalThis.__notify_sendMail = async function(options) {
      return await $0.apply(undefined, [options], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [
      async (options: { to: string[]; subject: string; body: string; bodyType?: string }) =>
        api.notify.sendMail(options),
    ],
    { arguments: { reference: true } },
  );

  // Inject workflow.executeSubGraph (async)
  await context.evalClosure(
    `globalThis.__workflow_executeSubGraph = async function(nodes, edges) {
      return await $0.apply(undefined, [nodes, edges], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [async (nodes: unknown[], edges: unknown[]) => api.workflow.executeSubGraph(nodes, edges)],
    { arguments: { reference: true } },
  );

  // Inject sse.emit (async)
  await context.evalClosure(
    `globalThis.__sse_emit = async function(type, payload, targetUserId) {
      return await $0.apply(undefined, [type, payload, targetUserId], { arguments: { copy: true }, result: { copy: true, promise: true } });
    }`,
    [
      async (type: string, payload: Record<string, unknown>, targetUserId?: string) =>
        api.sse.emit(type, payload, targetUserId),
    ],
    { arguments: { reference: true } },
  );

  // Build the __api object inside the isolate
  await context.eval(`
    var __api = {
      variables: {
        get: function(key) { return __variables_get(key); },
        set: function(key, value) { return __variables_set(key, value); },
        delete: function(key) { return __variables_delete(key); },
        all: function() { return __variables_all(); }
      },
      http: {
        get: function(url, options) { return __http_get(url, options); },
        post: function(url, options) { return __http_post(url, options); },
        put: function(url, options) { return __http_put(url, options); },
        patch: function(url, options) { return __http_patch(url, options); },
        delete: function(url, options) { return __http_delete(url, options); }
      },
      log: {
        info: function(msg, meta) { return __log_info(msg, meta); },
        warn: function(msg, meta) { return __log_warn(msg, meta); },
        error: function(msg, meta) { return __log_error(msg, meta); }
      },
      context: __context_data,
      iot: {
        readPoint: async function(name) { return await __iot_readPoint(name); },
        readPoints: async function(names) { return await __iot_readPoints(names); },
        writePoint: async function(name, values) { return await __iot_writePoint(name, values); }
      },
      notify: {
        send: function(options) { return __notify_send(options); },
        sendMail: function(options) { return __notify_sendMail(options); }
      },
      sse: {
        emit: async function(type, payload, targetUserId) { return await __sse_emit(type, payload, targetUserId); }
      },
      env: {
        get: function(key) { return __env_get(key); }
      },
      utils: {
        sleep: function(ms) { return __utils_sleep(ms); }
      },
      expr: {
        evaluateBoolean: function(expression) { return __expr_evaluateBoolean(expression); },
        evaluateExpression: function(expression) { return __expr_evaluateExpression(expression); }
      },
      db: {
        execute: function(operation, table, where, data, returning) { return __db_execute(operation, table, where, data, returning); }
      },
      workflow: {
        executeSubGraph: function(nodes, edges) { return __workflow_executeSubGraph(nodes, edges); }
      }
    };
  `);
}
