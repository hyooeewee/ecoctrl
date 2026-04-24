import { get } from "./request";
import type { Fault, FaultStats } from "@ecoctrl/shared";

export const faultsApi = {
  list: () => get<Fault[]>("/faults"),
  stats: () => get<FaultStats>("/faults/stats"),
};
