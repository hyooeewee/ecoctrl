import { z } from "zod";

export const DataModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  format: z.string(),
  size: z.string(),
  deviceType: z.string(),
  fileUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  docUrl: z.string().nullable(),
});
export type DataModel = z.infer<typeof DataModelSchema>;
