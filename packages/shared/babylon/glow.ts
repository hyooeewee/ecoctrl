// ========================================
// Glow Layer
// ========================================

import { Scene, GlowLayer } from "@babylonjs/core";

/**
 * Create a GlowLayer post-process effect on the scene.
 */
export function createGlowLayer(scene: Scene, intensity: number = 0.5): GlowLayer {
  const glow = new GlowLayer("glow", scene);
  glow.intensity = intensity;
  return glow;
}
