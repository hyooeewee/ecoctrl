import { apiGet } from "./api";

export interface PetEntry {
  id: string;
  displayName: string;
  description?: string;
  spritesheetUrl: string;
  kind?: string;
  source: "built-in" | "remote";
}

export interface PetsListResponse {
  pets: PetEntry[];
}

export const petsApi = {
  list: async (): Promise<PetEntry[]> => {
    const res = await apiGet<PetsListResponse>("/api/pets");
    if (!res.ok) {
      throw new Error(res.error ?? "Failed to load pets");
    }
    return res.data?.pets ?? [];
  },
};
