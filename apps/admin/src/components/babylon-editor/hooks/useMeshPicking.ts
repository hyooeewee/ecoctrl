// ========================================
// Mesh Picking Hook
// ========================================

import { useEffect, useRef, useState, useCallback } from "react";
import { Scene, Vector3, Observer, Mesh, PointerInfo, PointerEventTypes } from "@babylonjs/core";

export interface PickedInfo {
  position: Vector3;
  mesh: Mesh | null;
  pickedPoint: Vector3 | null;
}

interface UseMeshPickingOptions {
  scene: Scene | null;
  enabled: boolean;
  onPick?: (info: PickedInfo) => void;
}

export function useMeshPicking({ scene, enabled, onPick }: UseMeshPickingOptions) {
  const [pickedInfo, setPickedInfo] = useState<PickedInfo | null>(null);
  const observerRef = useRef<Observer<PointerInfo> | null>(null);

  const clearPick = useCallback(() => {
    setPickedInfo(null);
  }, []);

  useEffect(() => {
    if (!scene || !enabled) {
      // Cleanup observer
      if (observerRef.current) {
        scene?.onPointerObservable.remove(observerRef.current);
        observerRef.current = null;
      }
      return;
    }

    const observer = scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== PointerEventTypes.POINTERPICK) return;

      const pickResult = scene.pick(scene.pointerX, scene.pointerY);
      if (!pickResult?.hit || !pickResult.pickedMesh) {
        setPickedInfo(null);
        return;
      }

      const mesh = pickResult.pickedMesh as Mesh;
      const pickedPoint = pickResult.pickedPoint ?? mesh.getAbsolutePosition();

      const info: PickedInfo = {
        position: pickedPoint.clone(),
        mesh,
        pickedPoint: pickedPoint.clone(),
      };

      setPickedInfo(info);
      onPick?.(info);
    });

    observerRef.current = observer;

    return () => {
      scene.onPointerObservable.remove(observer);
      observerRef.current = null;
    };
  }, [scene, enabled, onPick]);

  return {
    pickedInfo,
    clearPick,
  };
}
