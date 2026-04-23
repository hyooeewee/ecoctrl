import { get } from "./request";
import { Fault } from "../types";

export interface FaultStats {
  totalCount: number;
  trend: string;
  mttr: number;
  avgResponseTime: string;
}

export const faultsApi = {
  list: () => get<Fault[]>("/faults"),
  stats: () => get<FaultStats>("/faults/stats"),
};
