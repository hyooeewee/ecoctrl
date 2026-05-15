import { z } from "zod";
import type { Tool } from "../types";

const params = z.object({});

export const getDashboardDataTool: Tool = {
  name: "getDashboardData",
  description: "Get current dashboard widget data",
  parameters: params,
  minRole: "user",
  handler: async () => {
    return { widgets: [], timestamp: new Date().toISOString() };
  },
};
