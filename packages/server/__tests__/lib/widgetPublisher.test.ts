import { describe, it, expect, vi, beforeEach } from "vitest";
import { emitWidgetUpdate, emitWidgetDelete } from "@/lib/widgetPublisher";

// Mock the notifyTrigger module
vi.mock("@/lib/notifyTrigger", () => ({
  emitEvent: vi.fn(),
}));

describe("widgetPublisher", () => {
  it("should emit widget_update event", async () => {
    await emitWidgetUpdate("widget-1", "stat", { value: "100" });
  });

  it("should emit widget_delete event", async () => {
    await emitWidgetDelete("widget-1");
  });
});
