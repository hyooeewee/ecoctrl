import { z } from "zod";

export const Model3DSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  format: z.string(),
  size: z.string(),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
});
export type Model3D = z.infer<typeof Model3DSchema>;
