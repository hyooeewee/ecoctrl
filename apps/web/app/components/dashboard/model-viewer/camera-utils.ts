import { ArcRotateCamera, CubicEase, EasingFunction, Animation } from "@babylonjs/core";

// ========================================
// Camera animation helpers
// ========================================

/**
 * Animate camera radius with easing.
 */
export function animateCameraRadius(camera: ArcRotateCamera, toRadius: number, duration = 30) {
  const frameRate = 60;
  const anim = new Animation("camRadius", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  anim.setEasingFunction(easing);
  anim.setKeys([
    { frame: 0, value: camera.radius },
    { frame: duration, value: toRadius },
  ]);
  camera.animations = [anim];
  camera.getScene().beginAnimation(camera, 0, duration, false, 1, () => {
    camera.animations = [];
  });
}

/**
 * Animate alpha/beta/radius together for immersive label focus.
 * Uses shortest-path interpolation for alpha to handle 0↔2π wrap.
 */
export function animateCameraTo(
  camera: ArcRotateCamera,
  toAlpha: number,
  toBeta: number,
  toRadius: number,
  duration = 45,
) {
  const frameRate = 60;
  const scene = camera.getScene();

  // Shortest delta for alpha (handles wrap-around)
  let deltaAlpha = toAlpha - camera.alpha;
  while (deltaAlpha > Math.PI) deltaAlpha -= Math.PI * 2;
  while (deltaAlpha < -Math.PI) deltaAlpha += Math.PI * 2;
  const endAlpha = camera.alpha + deltaAlpha;

  const animAlpha = new Animation("camAlpha", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animBeta = new Animation("camBeta", "beta", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animRadius = new Animation("camRadius", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT);

  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  [animAlpha, animBeta, animRadius].forEach((a) => a.setEasingFunction(easing));

  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: duration, value: endAlpha },
  ]);
  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: duration, value: toBeta },
  ]);
  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: duration, value: toRadius },
  ]);

  camera.animations = [animAlpha, animBeta, animRadius];
  scene.beginAnimation(camera, 0, duration, false, 1, () => {
    camera.animations = [];
  });
}
