import type { LightingGroup, LightingRegionGroups } from "@ecoctrl/shared";
import { apiGet, apiPost } from "./api";

export interface LightingRegionsResponse {
  regions: string[];
}

export interface LightingGroupResponse {
  group: LightingGroup;
}

export interface LightingBatchResponse {
  region: string;
  groups: LightingGroup[];
}

export async function fetchLightingRegions() {
  return apiGet<LightingRegionsResponse>("/api/control/lighting/regions");
}

export async function fetchLightingGroups(region: string) {
  return apiGet<LightingRegionGroups>(`/api/control/lighting/${encodeURIComponent(region)}/groups`);
}

export async function updateLightingGroup(region: string, groupKey: string, status: "off" | "on") {
  return apiPost<LightingGroupResponse>(
    `/api/control/lighting/${encodeURIComponent(region)}/${encodeURIComponent(groupKey)}`,
    { status },
  );
}

export async function batchUpdateLightingGroups(region: string, status: "off" | "on") {
  return apiPost<LightingBatchResponse>(
    `/api/control/lighting/${encodeURIComponent(region)}/batch`,
    { status },
  );
}
