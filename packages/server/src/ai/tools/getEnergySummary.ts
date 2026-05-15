import { z } from "zod";
import type { Tool } from "../types";

const params = z.object({});

export const getEnergySummaryTool: Tool = {
  name: "getEnergySummary",
  description: "Get a summary of current energy consumption data",
  parameters: params,
  minRole: "user",
  handler: async () => {
    return { summary: "Energy summary placeholder", totalKwh: 0 };
  },
};
