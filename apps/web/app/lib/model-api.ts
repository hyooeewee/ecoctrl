import type { DashboardModelConfig } from "@ecoctrl/shared";
import { API_PREFIX } from "~/lib/env";
import { apiGet } from "./api";

export async function fetchPublicModel(): Promise<DashboardModelConfig | null> {
  try {
    const res = await apiGet<DashboardModelConfig>(`${API_PREFIX}/public/model`);
    if (res.ok && res.data) return res.data;
  } catch {
    // Endpoint not ready yet — fall back to hardcoded defaults.
  }
  return null;
}
