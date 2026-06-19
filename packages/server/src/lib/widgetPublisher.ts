import { emitEvent } from "./notifyTrigger";
import type { WidgetUpdatePayload } from "@/sse/types";

/**
 * Emit a widget data update event.
 * All connected SSE clients will receive this update.
 */
export async function emitWidgetUpdate(
  metricKey: string,
  type: WidgetUpdatePayload["type"],
  data: Record<string, unknown>,
): Promise<void> {
  await emitEvent("widget_update", { metricKey, type, data });
}

/**
 * Emit a widget deletion event.
 */
export async function emitWidgetDelete(metricKey: string): Promise<void> {
  await emitEvent("widget_delete", { metricKey });
}
