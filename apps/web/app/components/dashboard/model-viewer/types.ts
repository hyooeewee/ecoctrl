import type { ModelFileEntry, DashboardModelLabel } from "@ecoctrl/shared";
import type { TransformNode, Vector3 } from "@babylonjs/core";

// ========================================
// Runtime types extending shared types
// ========================================

/**
 * Runtime model group with loaded BabylonJS node.
 * Extends shared ModelFileEntry with runtime state.
 */
export interface ModelGroup extends ModelFileEntry {
  rootNode: TransformNode | null;
  visible: boolean;
}

export interface LabelAnchor {
  key: string;
  groupId: string;
  worldPos: Vector3;
  source: "mesh" | "position";
}

export interface ModelLoadConfig {
  groups?: ModelFileEntry[];
  fallbackUrl?: string;
  globalLabels?: DashboardModelLabel[];
}

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  onLoad?: () => void;
  onCriticalLoaded?: () => void;
  onProgress?: (progress: number) => void;
  glowIntensity: number;
  defaultCameraRadius: number;
  defaultRotationY: number;
}
