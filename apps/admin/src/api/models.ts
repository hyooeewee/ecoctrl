import { get } from "./request";
import { Model3D } from "../types";

export const modelsApi = {
  list: () => get<Model3D[]>("/api/models"),
};
