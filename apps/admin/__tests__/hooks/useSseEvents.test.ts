import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSseEvents } from "@/hooks/useSseEvents";
import { useSse } from "@/hooks/useSse";

vi.mock("@/hooks/useSse", () => ({
  useSse: vi.fn(() => ({
    status: "connected",
    addHandler: vi.fn(() => () => {}),
  })),
}));

describe("useSseEvents", () => {
  it("returns handlers object for supported event types", () => {
    const { result } = renderHook(() => useSseEvents());
    expect(typeof result.current.onWorkflowExecution).toBe("function");
    expect(typeof result.current.onAlert).toBe("function");
  });
});
