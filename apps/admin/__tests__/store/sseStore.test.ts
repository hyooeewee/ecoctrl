import { describe, it, expect } from "vitest";
import { useSseStore } from "@/store/sseStore";

describe("sseStore", () => {
  it("tracks connection state", () => {
    const store = useSseStore.getState();
    expect(store.status).toBe("idle");

    store.setStatus("connected");
    expect(useSseStore.getState().status).toBe("connected");
  });

  it("increments unread alert count", () => {
    const store = useSseStore.getState();
    store.incrementUnread("alert");
    expect(useSseStore.getState().unread.alert).toBe(1);
  });

  it("clears unread counts", () => {
    const store = useSseStore.getState();
    store.incrementUnread("alert");
    store.clearUnread("alert");
    expect(useSseStore.getState().unread.alert).toBe(0);
  });
});
