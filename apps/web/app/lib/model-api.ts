import { API_PREFIX } from "~/lib/env";
import { apiGet } from "./api";

export interface ModelLabel {
  key: string;
  fallbackPosition: { x: number; y: number; z: number };
  meshKeywords: string[];
  focusAlpha: number;
  focusBeta: number;
  focusRadius: number;
}

export interface PublicModelData {
  modelFileUrl?: string;
  labels?: ModelLabel[];
}

export async function fetchPublicModel(): Promise<PublicModelData | null> {
  try {
    const res = await apiGet<PublicModelData>(`${API_PREFIX}/public/model`);
    if (res.ok && res.data) return res.data;
  } catch {
    // Endpoint not ready yet — fall back to hardcoded defaults.
  }
  return null;
}
