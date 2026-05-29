// ========================================
// Clipping Preview Hook
// ========================================

import { useEffect, useRef, useCallback } from "react";
import {
  Scene,
  Vector3,
  Plane,
  Animation,
  Mesh,
  StandardMaterial,
  Color3,
  MeshBuilder,
  Matrix,
  Quaternion,
} from "@babylonjs/core";

export interface ClippingConfig {
  planeNormal: { x: number; y: number; z: number };
  planeOffset: number;
  duration: number;
}

interface UseClippingPreviewOptions {
  scene: Scene | null;
  config: ClippingConfig | null;
  enabled: boolean;
}

export function useClippingPreview({ scene, config, enabled }: UseClippingPreviewOptions) {
  const indicatorRef = useRef<Mesh | null>(null);

  // ========================================
  // Create indicator plane
  // ========================================

  const createIndicator = useCallback((scene: Scene, normal: Vector3, offset: number): Mesh => {
    // Dispose old indicator
    if (indicatorRef.current) {
      indicatorRef.current.dispose();
    }

    // Create semi-transparent plane
    const plane = MeshBuilder.CreatePlane("clipIndicator", { size: 20 }, scene);

    const mat = new StandardMaterial("clipIndicatorMat", scene);
    mat.diffuseColor = new Color3(1, 0.3, 0.3);
    mat.alpha = 0.25;
    mat.backFaceCulling = false;
    plane.material = mat;

    // Position and orient the plane
    updateIndicatorTransform(plane, normal, offset);

    indicatorRef.current = plane;
    return plane;
  }, []);

  // ========================================
  // Update indicator transform
  // ========================================

  const updateIndicatorTransform = useCallback((plane: Mesh, normal: Vector3, offset: number) => {
    // Position: point along normal at offset distance
    const pos = normal.scale(offset);
    plane.position = pos;

    // Rotation: align plane to face along normal
    const up = Vector3.Up();
    const right = Vector3.Cross(up, normal).normalize();
    const correctedUp = Vector3.Cross(normal, right).normalize();

    // Create rotation matrix from axes
    const rotationMatrix = Matrix.Identity();
    const rotationQuat = new Quaternion();
    Matrix.FromXYZAxesToRef(right, correctedUp, normal, rotationMatrix);
    rotationQuat.fromRotationMatrix(rotationMatrix);
    plane.rotationQuaternion = rotationQuat;
  }, []);

  // ========================================
  // Apply clip plane with animation
  // ========================================

  useEffect(() => {
    if (!scene) return;

    if (!enabled || !config) {
      // Disable clipping
      scene.clipPlane = null;
      if (indicatorRef.current) {
        indicatorRef.current.dispose();
        indicatorRef.current = null;
      }
      return;
    }

    const normal = new Vector3(
      config.planeNormal.x,
      config.planeNormal.y,
      config.planeNormal.z,
    ).normalize();

    const targetOffset = config.planeOffset;
    const duration = config.duration;

    // Create indicator
    createIndicator(scene, normal, targetOffset);

    // Apply clip plane
    scene.clipPlane = new Plane(normal.x, normal.y, normal.z, -targetOffset);

    return () => {
      scene.clipPlane = null;
    };
  }, [scene, config, enabled, createIndicator]);

  // ========================================
  // Cleanup
  // ========================================

  useEffect(() => {
    return () => {
      if (indicatorRef.current) {
        indicatorRef.current.dispose();
        indicatorRef.current = null;
      }
    };
  }, []);

  return {
    indicator: indicatorRef.current,
  };
}
