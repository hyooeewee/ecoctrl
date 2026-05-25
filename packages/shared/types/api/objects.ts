import { z } from "zod";

export const BusinessObjectSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  modelId: z.string(),
  status: z.string().optional(),
});
export type BusinessObject = z.infer<typeof BusinessObjectSchema>;
