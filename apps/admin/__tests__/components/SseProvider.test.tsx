import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SseProvider } from "@/components/SseProvider";

const mockOnAlert = vi.fn();
const mockOnWorkflowExecution = vi.fn();
const mockOnNotification = vi.fn();
const mockIncrementUnread = vi.fn();

vi.mock("@/hooks/useSseEvents", () => ({
  useSseEvents: () => ({
    onAlert: mockOnAlert,
    onWorkflowExecution: mockOnWorkflowExecution,
    onNotification: mockOnNotification,
  }),
}));

vi.mock("@/store/sseStore", () => ({
  useSseStore: (selector: (s: { incrementUnread: typeof mockIncrementUnread }) => unknown) =>
    selector({ incrementUnread: mockIncrementUnread }),
}));

describe("SseProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(
      <SseProvider>
        <div data-testid="child">Hello</div>
      </SseProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("subscribes to SSE events on mount", () => {
    render(
      <SseProvider>
        <div>content</div>
      </SseProvider>,
    );

    expect(mockOnAlert).toHaveBeenCalled();
    expect(mockOnWorkflowExecution).toHaveBeenCalled();
    expect(mockOnNotification).toHaveBeenCalled();
  });
});
