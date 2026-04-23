import { get } from "./request";
import { EnergyArea } from "../types";

export const energyApi = {
  areas: () => get<EnergyArea[]>("/energy/areas"),
};
