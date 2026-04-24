import { get } from "./request";
import type { EnergyArea } from "@ecoctrl/shared";

export const energyApi = {
  areas: () => get<EnergyArea[]>("/energy/areas"),
};
