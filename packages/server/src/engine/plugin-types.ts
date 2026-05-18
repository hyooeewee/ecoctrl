export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  category: "trigger" | "action" | "condition";
  description?: string;
  entry: string;
  schema: string;
  icon?: string;
  author?: string;
  minEngineVersion?: string;
}

export interface PluginDefinition {
  id: string;
  version: string;
  manifest: PluginManifest;
  backendCode: string;
  schema: Record<string, unknown>;
  iconSvg?: string;
}

export interface PluginVersionInfo {
  id: string;
  version: string;
  manifest: PluginManifest;
  refCount: number;
  refWorkflows: string[];
  installedAt: string;
  deprecated: boolean;
}

export interface HttpResponse {
  status: number;
  body: string;
  json(): unknown;
}

export interface ExecutionContext {
  variables: Map<string, unknown>;
  nodeOutputs: Map<string, Record<string, unknown>>;
  triggerData: Record<string, unknown>;
  env: Record<string, string>;
}

export interface PluginApi {
  variables: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    delete(key: string): void;
    all(): Record<string, unknown>;
  };
  http: {
    get(
      url: string,
      options?: { headers?: Record<string, string>; timeout?: number },
    ): Promise<HttpResponse>;
    post(
      url: string,
      options?: { headers?: Record<string, string>; body?: string | object; timeout?: number },
    ): Promise<HttpResponse>;
    put(
      url: string,
      options?: { headers?: Record<string, string>; body?: string | object; timeout?: number },
    ): Promise<HttpResponse>;
    patch(
      url: string,
      options?: { headers?: Record<string, string>; body?: string | object; timeout?: number },
    ): Promise<HttpResponse>;
    delete(
      url: string,
      options?: { headers?: Record<string, string>; timeout?: number },
    ): Promise<HttpResponse>;
  };
  iot: {
    readPoint(name: string): Promise<unknown>;
    readPoints(names: string[]): Promise<Record<string, unknown>>;
    writePoint(name: string, values: Record<string, unknown>): Promise<void>;
  };
  notify: {
    send(options: {
      title: string;
      content: string;
      level?: "info" | "warning" | "error";
      to?: string[];
    }): Promise<void>;
    sendMail(options: {
      to: string[];
      subject: string;
      body: string;
      bodyType?: string;
    }): Promise<void>;
  };
  log: {
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };
  env: {
    get(key: string): string | undefined;
  };
  context: {
    workflowId: string;
    executionId: string;
    triggerData: Record<string, unknown>;
    nodeId: string;
    nodeName: string;
  };
  utils: {
    sleep(ms: number): Promise<void>;
  };
  expr: {
    evaluateBoolean(expression: string): boolean;
    evaluateExpression(expression: string): unknown;
  };
  db: {
    execute(
      operation: string,
      table: string,
      where?: Record<string, unknown>,
      data?: Record<string, unknown>,
      returning?: string[],
    ): Promise<Record<string, unknown>>;
  };
  workflow: {
    executeSubGraph(nodes: unknown[], edges: unknown[]): Promise<Record<string, unknown>>;
  };
}
