import type { Tool } from "../types";
import { navigateToTool } from "./navigateTo";
import { getEnergySummaryTool } from "./getEnergySummary";
import { getDashboardDataTool } from "./getDashboardData";
import { createReportTool } from "./createReport";

const ROLE_ORDER = ["guest", "user", "admin", "superadmin"] as const;

const ALL_TOOLS: Tool[] = [
  navigateToTool,
  getEnergySummaryTool,
  getDashboardDataTool,
  createReportTool,
];

export function getToolsForRole(role: string): Tool[] {
  const roleIndex = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number]);
  if (roleIndex === -1) return [];

  return ALL_TOOLS.filter((tool) => {
    const toolIndex = ROLE_ORDER.indexOf(tool.minRole);
    return toolIndex <= roleIndex;
  });
}

export function findTool(name: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
