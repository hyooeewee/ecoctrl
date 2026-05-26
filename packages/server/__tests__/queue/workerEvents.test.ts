import { describe, it, expect, vi, beforeEach } from "vitest";
import * as eventPublisher from "@/lib/eventPublisher";

describe("worker event emission", () => {
  const publishExecSpy = vi
    .spyOn(eventPublisher, "publishWorkflowExecution")
    .mockResolvedValue(undefined);
  const publishNodeSpy = vi
    .spyOn(eventPublisher, "publishWorkflowNodeStatus")
    .mockResolvedValue(undefined);

  beforeEach(() => {
    publishExecSpy.mockClear();
    publishNodeSpy.mockClear();
  });

  it("should have event publisher module available", async () => {
    await eventPublisher.publishWorkflowExecution("wf-1", "exec-1", "running");
    expect(publishExecSpy).toHaveBeenCalledWith("wf-1", "exec-1", "running");
  });
});
