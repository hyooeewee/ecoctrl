// ========================================
// Sandbox-style Environment Setup
// ========================================
//
// HDR environment skybox + IBL + tone matching the Babylon.js sandbox.
// Reference: packages/tools/sandbox/src/components/renderingZone.tsx

import { CubeTextureCreateFromPrefilteredData } from "@babylonjs/core/Materials/Textures/cubeTexture.pure";
import type { Mesh, Scene } from "@babylonjs/core";

// ========================================
// Available Environments
// ========================================
//
// Switch by changing the ACTIVE_ENV entry below.
// All hosted on assets.babylonjs.com/environments/.

const ENVIRONMENTS = {
  /** Neutral studio — no color cast, preserves original PBR colors. */
  studio: "https://assets.babylonjs.com/environments/studio.env",
  /** San Giuseppe Bridge — warm sunset tones (sandbox default). */
  sanGiuseppeBridge: "https://assets.babylonjs.com/environments/sanGiuseppeBridge.env",
  /** Neutral specular — similar to studio, used by createDefaultEnvironment. */
  environmentSpecular: "https://assets.babylonjs.com/environments/environmentSpecular.env",
  /** Ulmer Münster plaza — outdoor neutral. */
  ulmerMuenster: "https://assets.babylonjs.com/environments/ulmerMuenster.env",
} as const;

type EnvKey = keyof typeof ENVIRONMENTS;

// ========================================
// Active Environment — change this to switch
// ========================================
const ACTIVE_ENV: EnvKey = "studio";

const DEFAULT_ENV_URL = ENVIRONMENTS[ACTIVE_ENV];

export interface SandboxEnvironmentOptions {
  /** Override the default environment texture URL. */
  envUrl?: string;
}

/**
 * Set up a sandbox-style environment on the given scene.
 *
 *   1. Loads .env texture via CubeTextureCreateFromPrefilteredData
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
  const { envUrl = DEFAULT_ENV_URL } = options;

  const envTexture = CubeTextureCreateFromPrefilteredData(envUrl, scene);

  envTexture.onLoadObservable.add(() => {
    console.log(`[environment] loaded: ${envUrl}`);
  });

  scene.environmentTexture = envTexture;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;

  // pbr=true → PBRMaterial skybox; blur=0.3 → microSurface=0.7
  const skybox = scene.createDefaultSkybox(envTexture, true, 1000, 0.3, false);

  return skybox;
}
