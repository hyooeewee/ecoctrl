export interface SSEEvent<T = unknown> {
  id?: string;
  type: string;
  payload: T;
  timestamp: string;
}

export interface SSEConnection {
  id: string;
  userId: string | null;
  reply: {
    raw: NodeJS.WritableStream;
  };
  connectedAt: number;
}

export type SSEEventType = "alert" | "device_update" | "workflow_status" | "notification" | "ping";

export interface AlertPayload {
  severity: "info" | "warning" | "error";
  title: string;
  message: string;
}

export interface DeviceUpdatePayload {
  code: string;
  value: unknown;
  timestamp: string;
}

export interface WorkflowStatusPayload {
  workflowId: string;
  nodeId: string;
  status: "running" | "completed" | "failed";
  message?: string;
}

export interface WidgetUpdatePayload {
  widgetId: string;
  type: "stat" | "chart" | "list" | "weather";
  data: Record<string, unknown>;
}

export interface WidgetEventMap {
  widget_update: WidgetUpdatePayload;
  widget_delete: { widgetId: string };
}
