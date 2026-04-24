import { z } from "zod";

export const FaultSchema = z.object({
  id: z.string(),
  device: z.string(),
  level: z.enum(["严重", "一般", "提示"]),
  time: z.string(),
  status: z.enum(["待处理", "维保中", "已修复"]),
});
export type Fault = z.infer<typeof FaultSchema>;

export const FaultStatsSchema = z.object({
  totalCount: z.number(),
  trend: z.string(),
  mttr: z.number(),
  avgResponseTime: z.string(),
});
export type FaultStats = z.infer<typeof FaultStatsSchema>;
