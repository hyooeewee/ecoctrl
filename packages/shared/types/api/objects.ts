import { z } from "zod";

export const ObjectPointSchema = z.object({
  id: z.string(),
  pointId: z.string(),
  pointName: z.string(),
  values: z.record(z.string()),
});

export const BusinessObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  points: z.array(ObjectPointSchema).default([]),
});

export type ObjectPoint = z.infer<typeof ObjectPointSchema>;
export type BusinessObject = z.infer<typeof BusinessObjectSchema>;
