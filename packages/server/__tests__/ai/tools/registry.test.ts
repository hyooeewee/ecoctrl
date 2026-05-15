import { describe, it, expect } from "vitest";
import { getToolsForRole } from "../../../src/ai/tools/registry";

describe("getToolsForRole", () => {
  it("returns empty array for guest", () => {
    const tools = getToolsForRole("guest");
    expect(tools.length).toBe(0);
  });

  it("returns navigateTo for user", () => {
    const tools = getToolsForRole("user");
    const names = tools.map((t) => t.name);
    expect(names).toContain("navigateTo");
    expect(names).toContain("getEnergySummary");
    expect(names).not.toContain("createReport");
  });

  it("returns admin tools for admin", () => {
    const tools = getToolsForRole("admin");
    const names = tools.map((t) => t.name);
    expect(names).toContain("createReport");
    expect(names).not.toContain("updateSystemConfig");
  });

  it("returns all tools for superadmin", () => {
    const tools = getToolsForRole("superadmin");
    expect(tools.length).toBeGreaterThan(0);
  });
});
