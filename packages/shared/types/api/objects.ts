import { z } from "zod";

export const BusinessObjectSchema = z.object({
  uuid: z.string(),
  id: z.string(),
  name: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  status: z.string().optional(),
});
export type BusinessObject = z.infer<typeof BusinessObjectSchema>;
