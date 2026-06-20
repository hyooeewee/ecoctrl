// ========================================
// Sandbox-style Environment Setup
// ========================================
//
// HDR environment skybox + IBL + tone mapping matching the Babylon.js sandbox.
// Reference: packages/tools/sandbox/src/components/renderingZone.tsx

import { CubeTextureCreateFromPrefilteredData } from "@babylonjs/core/Materials/Textures/cubeTexture.pure";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import type { BaseTexture, Mesh, Scene } from "@babylonjs/core";

// ========================================
// Available Environments
// ========================================

export const ENVIRONMENTS = {
  // --- Studio (local, neutral) ---
  /** Clean studio softboxes — neutral, good metallic reflections. */
  studio: "/studio_small_09_1k.hdr",
  /** Hard directional light — sharp metallic highlights, industrial feel. */
  cyclorama: "/cyclorama_hard_light_1k.hdr",
  /** Warm-neutral studio with soft fill. */
  studioSoft: "/studio_small_03_1k.hdr",

  // --- Industrial / outdoor (local, fits steel architecture) ---
  /** Construction site — industrial, raw steel tones. */
  constructionYard: "/construction_yard_1k.hdr",
  /** Urban bridge setting — steel/concrete, cool overcast. */
  betweenBridges: "/between_bridges_1k.hdr",

  // --- CDN (remote, fallback) ---
  /** Warm sunset tones (sandbox default). */
  sanGiuseppeBridge: "https://assets.babylonjs.com/environments/sanGiuseppeBridge.env",
  /** Neutral specular — similar to studio. */
  environmentSpecular: "https://assets.babylonjs.com/environments/environmentSpecular.env",
  /** Ulmer Münster plaza — outdoor neutral. */
  ulmerMuenster: "https://assets.babylonjs.com/environments/ulmerMuenster.env",
} as const;

export type EnvKey = keyof typeof ENVIRONMENTS;

export const DEFAULT_ENV_KEY: EnvKey = "studio";

export interface SandboxEnvironmentOptions {
  /** Environment texture URL. Defaults to studio. */
  envUrl?: string;
  /**
   * IBL intensity on PBR materials (0–1). Lower values preserve original
   * material colors; higher values let the environment dominate.
   * Default: 0.05 (very subtle ambient fill).
   */
  environmentIntensity?: number;
}

/** Load the appropriate texture based on file extension. */
function loadEnvironmentTexture(url: string, scene: Scene): BaseTexture {
  if (url.endsWith(".hdr")) {
    return new HDRCubeTexture(url, scene, 256, false, true, false, true);
  }
  return CubeTextureCreateFromPrefilteredData(url, scene);
}

/**
 * Set up a sandbox-style environment on the given scene.
 *
 *   1. Loads HDR/ENV texture
 *   2. Sets scene.environmentTexture for IBL on PBR materials
 *   3. Creates skybox with PBRMaterial (pbr=true, blur=0.3)
 *   4. Enables tone mapping only (no exposure/contrast overrides)
 *
 * @returns The skybox mesh for cleanup (call .dispose()).
 */
export function setupSandboxEnvironment(
  scene: Scene,
  options: SandboxEnvironmentOptions = {},
): Mesh | null {
  const { envUrl = ENVIRONMENTS[DEFAULT_ENV_KEY], environmentIntensity = 0.05 } = options;

  const envTexture = loadEnvironmentTexture(envUrl, scene);

  envTexture.onLoadObservable.add(() => {
    console.log(`[environment] loaded: ${envUrl}`);
  });

  scene.environmentTexture = envTexture;
  scene.environmentIntensity = environmentIntensity;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;

  // pbr=true → PBRMaterial skybox; blur=0.3 → microSurface=0.7
  const skybox = scene.createDefaultSkybox(envTexture, true, 1000, 0.3, false);

  return skybox;
}
