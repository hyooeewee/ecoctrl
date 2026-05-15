import { z } from "zod";
import type { Tool } from "../types";

const params = z.object({
  page: z.string().describe("Target page path, e.g. '/analysis' or '/settings'"),
});

export const navigateToTool: Tool = {
  name: "navigateTo",
  description: "Navigate the user to a specific page in the application",
  parameters: params,
  minRole: "user",
  handler: async (args) => {
    const { page } = params.parse(args);
    return { success: true, navigatedTo: page };
  },
};
