import { get, put } from "./request";
import { ThreeDConfig } from "../types";

export const threeDConfigApi = {
  get: () => get<ThreeDConfig>("/api/3d-config"),
  update: (data: Partial<ThreeDConfig>) => put<ThreeDConfig>("/api/3d-config", data),
};
