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

export interface EnvironmentOptions {
  /** Whether to create skybox. Defaults to true (Sandbox style). */
  createSkybox?: boolean;
  /** Skybox size. Defaults to 100. */
  skyboxSize?: number;
  /** Skybox color as hex string. Defaults to '#ffffff'. */
  skyboxColor?: string;
  /** Whether to create ground. Defaults to true. */
  createGround?: boolean;
  /** Ground size. Defaults to 100. */
  groundSize?: number;
  /** Ground color as hex string. Defaults to '#7d7d7d'. */
  groundColor?: string;
  /** Enable ground shadow. Defaults to true. */
  enableGroundShadow?: boolean;
  /** Ground shadow level (0-1). Defaults to 0.5. */
  groundShadowLevel?: number;
  /** Camera exposure. Defaults to 0.6. */
  cameraExposure?: number;
  /** Camera contrast. Defaults to 1.6. */
  cameraContrast?: number;
  /** Enable tone mapping. Defaults to true. */
  toneMappingEnabled?: boolean;
  /** Setup image processing. Defaults to true. */
  setupImageProcessing?: boolean;
  /** Background clear color as hex string. Defaults to undefined (transparent for skybox). */
  clearColor?: string;
}

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  onLoad?: () => void;
  onCriticalLoaded?: () => void;
  onProgress?: (progress: number) => void;
  glowIntensity: number;
  defaultCameraRadius: number;
  defaultRotationY: number;
  /** Environment configuration. Uses Sandbox-style defaults; pass partial overrides to customize. */
  environment?: EnvironmentOptions;
}
