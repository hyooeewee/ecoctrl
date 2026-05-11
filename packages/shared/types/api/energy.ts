import { z } from "zod";

export const EnergyAreaSchema = z.object({
  id: z.number(),
  title: z.string(),
  current: z.number(),
  target: z.number(),
  color: z.string(),
  powerFactor: z.number(),
  loadRate: z.string(),
});
export type EnergyArea = z.infer<typeof EnergyAreaSchema>;

export const CarbonFactorSchema = z.object({
  id: z.number(),
  pkid: z.string().optional(),
  name: z.string(),
  unitGroup: z.string().optional(),
  category: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  rawData: z.unknown().optional(),
  updatedAt: z.string(),
});
export type CarbonFactor = z.infer<typeof CarbonFactorSchema>;

export const CarbonFactorNodeSchema = z.object({
  id: z.number(),
  pkid: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  nameEn: z.string().optional(),
  parentPkid: z.string().optional(),
  isLeaf: z.boolean(),
  updatedAt: z.string(),
});
export type CarbonFactorNode = z.infer<typeof CarbonFactorNodeSchema>;
