import { apiGet, apiPost } from "./api";

// ========================================
// Types
// ========================================

export interface LightingGroupStatus {
  id: string;
  name: string;
  status: "off" | "half" | "on";
}

// ========================================
// API functions
// ========================================

/** GET /api/control/lighting/:labelId/status — query group statuses */
export async function fetchLightingStatus(labelId: string) {
  return apiGet<{ groups: LightingGroupStatus[] }>(
    `/api/control/lighting/${encodeURIComponent(labelId)}/status`,
  );
}

/** POST /api/control/lighting/:labelId/toggle — toggle one group */
export async function toggleLightingGroup(labelId: string, id: string, status: "off" | "on") {
  return apiPost<LightingGroupStatus>(
    `/api/control/lighting/${encodeURIComponent(labelId)}/toggle`,
    { id, status },
  );
}

/** POST /api/control/lighting/:labelId/batch — batch toggle all groups under a label */
export async function batchToggleLightingGroups(labelId: string, status: "off" | "on") {
  return apiPost<{ groups: LightingGroupStatus[] }>(
    `/api/control/lighting/${encodeURIComponent(labelId)}/batch`,
    { status },
  );
}
