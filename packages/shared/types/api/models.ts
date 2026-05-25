import { z } from "zod";

export const DataModelSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  version: z.string().nullable(),
  format: z.string().nullable(),
  size: z.string().nullable(),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
});
export type DataModel = z.infer<typeof DataModelSchema>;
