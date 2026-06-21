import { Vector3 } from "@babylonjs/core";
import type { DashboardModelLabel } from "@ecoctrl/shared";

// ========================================
// Camera defaults
// ========================================

export const INITIAL_ALPHA = Math.PI / 4;
export const INITIAL_BETA = Math.PI / 2.8;
export const INITIAL_TARGET = new Vector3(0, 1.5, 0);

// ========================================
// Model fallback
// ========================================

export const FALLBACK_URL = "/building.glb";

// ========================================
// Default area labels (V2 format with operations)
// ========================================

export interface LabelDef {
  key: string;
  name: string;
  fallbackPosition: Vector3;
  meshKeywords: string[];
}

// No mock data — labels come from the API via DashboardModelConfig.labels.
export const DEFAULT_LABELS: LabelDef[] = [];

// No mock data — labels come from the API via DashboardModelConfig.labels.
export const DEFAULT_V2_LABELS: DashboardModelLabel[] = [];
