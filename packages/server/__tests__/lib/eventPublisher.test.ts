import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishWorkflowExecution, publishWorkflowNodeStatus } from "@/lib/eventPublisher";
import * as notifyTrigger from "@/lib/notifyTrigger";

describe("eventPublisher", () => {
  const emitEventSpy = vi.spyOn(notifyTrigger, "emitEvent").mockResolvedValue(undefined);

  beforeEach(() => {
    emitEventSpy.mockClear();
  });

  it("publishes workflow execution status", async () => {
    await publishWorkflowExecution("wf-1", "exec-1", "running", { source: "manual" });

    expect(emitEventSpy).toHaveBeenCalledOnce();
    const [type, payload] = emitEventSpy.mock.calls[0];
    expect(type).toBe("workflow_execution");
    expect(payload).toMatchObject({
      workflowId: "wf-1",
      executionId: "exec-1",
      status: "running",
      triggerData: { source: "manual" },
    });
    expect(payload.timestamp).toBeDefined();
  });

  it("publishes node status", async () => {
    await publishWorkflowNodeStatus(
      "wf-1",
      "exec-1",
      "node-1",
      "Test Node",
      "action",
      "completed",
      42,
    );

    expect(emitEventSpy).toHaveBeenCalledOnce();
    const [type, payload] = emitEventSpy.mock.calls[0];
    expect(type).toBe("workflow_node_status");
    expect(payload).toMatchObject({
      workflowId: "wf-1",
      executionId: "exec-1",
      nodeId: "node-1",
      nodeName: "Test Node",
      nodeType: "action",
      status: "completed",
      durationMs: 42,
    });
  });
});
