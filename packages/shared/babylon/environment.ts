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
//
// Switch by changing the ACTIVE_ENV key below.
// .env = prefiltered (fast load), .hdr = raw (runtime conversion, better quality)

const ENVIRONMENTS = {
  /** Clean studio softboxes — best for metallic reflections, neutral colors. */
  studio: "/studio_small_09_1k.hdr",
  /** San Giuseppe Bridge — warm sunset tones (sandbox default). */
  sanGiuseppeBridge: "https://assets.babylonjs.com/environments/sanGiuseppeBridge.env",
  /** Neutral specular — similar to studio. */
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
  /**
   * IBL intensity on PBR materials (0–1). Lower values preserve original
   * material colors; higher values let the environment dominate.
   * Default: 0.3 (subtle, keeps metallic look).
   */
  environmentIntensity?: number;
}

/** Load the appropriate texture based on file extension. */
function loadEnvironmentTexture(url: string, scene: Scene): BaseTexture {
  if (url.endsWith(".hdr")) {
    // .hdr = raw radiance format, converted to cubemap at runtime.
    // Args match sandbox: size=256, generateHarmonics, prefilterOnLoad, etc.
    return new HDRCubeTexture(url, scene, 256, false, true, false, true);
  }
  // .env = BabylonJS prefiltered format (fastest).
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
  const { envUrl = DEFAULT_ENV_URL, environmentIntensity = 0 } = options;

  const envTexture = loadEnvironmentTexture(envUrl, scene);

  envTexture.onLoadObservable.add(() => {
    console.log(`[environment] loaded: ${envUrl}`);
  });

  scene.environmentTexture = envTexture;
  // Controls how strongly IBL affects PBR materials.
  // 0 = skybox visual only (manual lights handle PBR illumination).
  // 1 = full environment influence (may wash out metallic colors).
  scene.environmentIntensity = environmentIntensity;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;

  // pbr=true → PBRMaterial skybox; blur=0.3 → microSurface=0.7
  const skybox = scene.createDefaultSkybox(envTexture, true, 1000, 0.3, false);

  return skybox;
}
