import type { DashboardData } from "~/components/dashboard/widgets/types";
import type { ApiResponse } from "~/lib/api";

import { apiGet, apiPatch } from "~/lib/api";

const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? "";
const DASHBOARD_ENDPOINT = `${API_PREFIX}/dashboard`;
const SETTINGS_ENDPOINT = `${API_PREFIX}/dashboard/settings`;

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const res = await apiGet<DashboardData>(DASHBOARD_ENDPOINT);

  if (res.ok && res.data) {
    return res.data;
  }

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
  bentoLayout?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    hidden: boolean;
  }>;
}

export async function fetchDashboardSettings(): Promise<
  ApiResponse<DashboardSettingsPayload>
> {
  return apiGet<DashboardSettingsPayload>(SETTINGS_ENDPOINT);
}

export async function patchDashboardSettings(
  payload: DashboardSettingsPayload,
): Promise<ApiResponse<void>> {
  return apiPatch<void>(SETTINGS_ENDPOINT, payload);
}

export type {
  DashboardData,
  WidgetConfig,
  WidgetData,
  WidgetLayout,
} from "~/components/dashboard/widgets/types";
