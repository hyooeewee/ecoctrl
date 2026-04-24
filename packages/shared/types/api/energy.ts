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
