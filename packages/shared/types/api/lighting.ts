import { z } from "zod";

// ========================================
// Lighting control types
// ========================================

export const LightingGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["off", "half", "on"]),
});

export const LightingRegionGroupsSchema = z.object({
  region: z.string(),
  groups: z.array(LightingGroupSchema),
});

export type LightingGroup = z.infer<typeof LightingGroupSchema>;
export type LightingRegionGroups = z.infer<typeof LightingRegionGroupsSchema>;
