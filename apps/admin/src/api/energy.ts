import { get, post } from "./request";
import type { EnergyArea, CarbonFactor, CarbonFactorNode } from "@ecoctrl/shared";

export const energyApi = {
  areas: () => get<EnergyArea[]>("/energy/areas"),
  carbonFactors: () => get<CarbonFactor[]>("/energy/carbon-factors"),
  carbonFactorTree: () => get<CarbonFactorNode[]>("/energy/carbon-factors/tree"),
  refreshCarbonFactorTree: () => post<{ count: number }>("/energy/carbon-factors/refresh"),
  fetchCarbonFactor: (pkid: string) =>
    post<{ count: number; data: CarbonFactor[] }>("/energy/carbon-factors/fetch", { pkid }),
};
