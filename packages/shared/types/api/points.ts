import { z } from "zod";

export const PointPropSchema = z.object({
  key: z.string(),
  name: z.string(),
  unit: z.string().optional(),
});

export const PointSchema = z.object({
  id: z.string(),
  objectId: z.string(),
  modelId: z.string(),
  pointType: z.string(),
  pointNo: z.string(),
  name: z.string(),
  props: z.array(PointPropSchema).default([]),
  values: z.record(z.string(), z.string()).default({}),
});

export type PointProp = z.infer<typeof PointPropSchema>;
export type Point = z.infer<typeof PointSchema>;
