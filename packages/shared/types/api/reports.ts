import { z } from "zod";

export const ReportPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  receiver: z.string(),
  frequency: z.string(),
  status: z.boolean(),
});
export type ReportPlan = z.infer<typeof ReportPlanSchema>;

export const ReportTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  count: z.string(),
  icon: z.string(),
});
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
