import { get } from "./request";
import { Fault } from "../types";

export interface FaultStats {
  totalCount: number;
  trend: string;
  mttr: number;
  avgResponseTime: string;
}

export const faultsApi = {
  list: () => get<Fault[]>("/api/faults"),
  stats: () => get<FaultStats>("/api/faults/stats"),
};
