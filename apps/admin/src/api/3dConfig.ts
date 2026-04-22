import { get, put } from "./request";
import { ThreeDConfig } from "../types";

export const threeDConfigApi = {
  get: () => get<ThreeDConfig>("/api/three-d-config"),
  update: (data: Partial<ThreeDConfig>) => put<ThreeDConfig>("/api/three-d-config", data),
};
