import { Plane, Scene } from "@babylonjs/core";

// ========================================
// Clip plane state management
// ========================================

export interface ClipState {
  currentY: number;
  targetY: number;
  lobbyTop: number;
}

/**
 * Smoothly interpolate clip plane toward targetY and apply to scene.
 * Plane(0, 1, 0, -y) keeps everything where y <= clipY.
 */
export function updateClipPlane(scene: Scene, state: ClipState): void {
  const targetY = state.targetY;
  const currentY = state.currentY;

  if (Math.abs(currentY - targetY) > 0.01) {
    state.currentY += (targetY - currentY) * 0.08;
  }

  if (state.currentY < 900) {
    scene.clipPlane = new Plane(0, 1, 0, -state.currentY);
  } else {
    scene.clipPlane = null;
  }
}

/**
 * Set the target Y for the clip plane.
 * A large value (999) means "no clipping" (plane above everything).
 */
export function setClipTarget(state: ClipState, targetY: number): void {
  state.targetY = targetY;
}
