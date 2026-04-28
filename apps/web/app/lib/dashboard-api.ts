import type { DashboardData } from "~/components/dashboard/widgets/types";
import type { ApiResponse } from "~/lib/api";

import { apiGet, apiPatch } from "~/lib/api";
import { API_PREFIX } from "~/lib/env";

const DASHBOARD_ENDPOINT = `${API_PREFIX}/public/dashboard`;
const PUBLIC_SETTINGS_ENDPOINT = `${API_PREFIX}/public/settings`;
// TODO: backend needs authenticated /api/settings (or /api/dashboard/setting)
const USER_SETTINGS_ENDPOINT = `${API_PREFIX}/settings`;

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const res = await apiGet<DashboardData>(DASHBOARD_ENDPOINT);

  if (res.ok && res.data) {
    return res.data;
  }

  console.error("[fetchDashboardData] API error:", res.error ?? "no data");
  return null;
}

// ─── Dashboard Settings (GET / PATCH) ───────────────────────────────────────

// Keep in sync with the syncable fields in app/store/settings.ts.
export interface DashboardSettingsPayload {
  language?: "zh-CN" | "en-US";
  reducedMotion?: boolean;
  autoRotate?: boolean;
  rotateSpeed?: number;
  showLabels?: boolean;
  glowIntensity?: number;
  defaultCameraRadius?: number;
  defaultRotationY?: number;
  dataRefreshInterval?: number;
  navHideDelay?: number;
  editAutoExitDelay?: number;
  showLoadingAnimation?: boolean;
  bentoLayout?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hidden: boolean;
  }>;
}

export async function fetchDashboardSettings(): Promise<ApiResponse<DashboardSettingsPayload>> {
  return apiGet<DashboardSettingsPayload>(PUBLIC_SETTINGS_ENDPOINT);
}

export async function patchDashboardSettings(
  payload: DashboardSettingsPayload,
): Promise<ApiResponse<void>> {
  return apiPatch<void>(PUBLIC_SETTINGS_ENDPOINT, payload);
}

// ─── User-specific Settings (authenticated) ───────────────────────────────────

export async function fetchUserSettings(): Promise<ApiResponse<DashboardSettingsPayload>> {
  return apiGet<DashboardSettingsPayload>(USER_SETTINGS_ENDPOINT);
}

export async function patchUserSettings(
  payload: DashboardSettingsPayload,
): Promise<ApiResponse<void>> {
  return apiPatch<void>(USER_SETTINGS_ENDPOINT, payload);
}

export type {
  DashboardData,
  WidgetConfig,
  WidgetData,
  WidgetLayout,
} from "~/components/dashboard/widgets/types";
