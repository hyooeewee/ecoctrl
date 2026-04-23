import { get, put } from "./request";
import { ThreeDConfig } from "../types";

export const threeDConfigApi = {
  get: () => get<ThreeDConfig>("/three-d-config"),
  update: (data: Partial<ThreeDConfig>) => put<ThreeDConfig>("/three-d-config", data),
};
