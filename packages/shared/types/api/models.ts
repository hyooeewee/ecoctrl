import { z } from "zod";

export const PointItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  props: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      unit: z.string().optional(),
    }),
  ),
});
export type PointItem = z.infer<typeof PointItemSchema>;

export const Model3DSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  format: z.string(),
  size: z.string(),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
  points: z.array(PointItemSchema).default([]),
});
export type Model3D = z.infer<typeof Model3DSchema>;
