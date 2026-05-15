import { z } from "zod";
import type { Tool } from "../types";

const params = z.object({
  title: z.string().describe("Report title"),
  frequency: z.enum(["daily", "weekly", "monthly"]).describe("Report frequency"),
});

export const createReportTool: Tool = {
  name: "createReport",
  description: "Create a new scheduled report",
  parameters: params,
  minRole: "admin",
  handler: async (args) => {
    const { title, frequency } = params.parse(args);
    return { success: true, reportId: "placeholder", title, frequency };
  },
};
