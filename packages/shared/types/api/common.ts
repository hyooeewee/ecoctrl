import { z } from "zod";

export const FileMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string(),
});
export type FileMeta = z.infer<typeof FileMetaSchema>;
