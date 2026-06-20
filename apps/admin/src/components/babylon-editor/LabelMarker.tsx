// ========================================
// Label Marker Component (GUI Billboard)
// ========================================

import { useEffect, useRef } from "react";
import { Scene, Vector3, TransformNode, Color3, Plane, Matrix } from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Ellipse, Rectangle } from "@babylonjs/gui";

export interface LabelMarkerData {
  id: string;
  name: string;
  position: Vector3;
  isSelected?: boolean;
  hasChildren?: boolean;
  color?: Color3;
}

interface UseLabelMarkersOptions {
  scene: Scene | null;
  guiTexture: AdvancedDynamicTexture | null;
  labels: LabelMarkerData[];
  selectedId: string | null;
  onLabelClick?: (id: string) => void;
  onLabelDragEnd?: (id: string, position: Vector3) => void;
}

export function useLabelMarkers({
  scene,
  guiTexture,
  labels,
  selectedId,
  onLabelClick,
  onLabelDragEnd,
}: UseLabelMarkersOptions) {
  const markersRef = useRef<
    Map<
      string,
      {
        container: Rectangle;
        anchor: TransformNode;
        isSelected: boolean;
      }
    >
  >(new Map());

  // ========================================
  // Create marker for a label
  // ========================================

  const createMarker = (gui: AdvancedDynamicTexture, label: LabelMarkerData) => {
    // Anchor node in 3D space
    const anchor = new TransformNode(`label_${label.id}`, scene);
    anchor.position = label.position;

    // Container rectangle
    const container = new Rectangle(`label_rect_${label.id}`);
    container.width = "120px";
    container.height = "28px";
    container.cornerRadius = 14;
    container.color = "white";
    container.thickness = 2;
    container.background = label.isSelected ? "#3b82f6" : "#1e293b";
    container.shadowColor = "rgba(0,0,0,0.3)";
    container.shadowBlur = 6;
    container.linkOffsetY = -20;
    container.isPointerBlocker = true;

    // Label text
    const text = new TextBlock(`label_text_${label.id}`);
    text.text = label.name;
    text.color = "white";
    text.fontSize = 12;
    text.fontFamily = "system-ui, sans-serif";
    container.addControl(text);

    // Connecting line (dot)
    const dot = new Ellipse(`label_dot_${label.id}`);
    dot.width = "10px";
    dot.height = "10px";
    dot.color = "white";
    dot.thickness = 2;
    dot.background = label.isSelected ? "#3b82f6" : "#1e293b";
    dot.linkOffsetY = 6;
    container.addControl(dot);

    // Link to 3D position
    gui.addControl(container);
    container.linkWithMesh(anchor);

    // Click / drag handler
    let isDragging = false;
    let hasMoved = false;
    let dragStartPointer = { x: 0, y: 0 };
    let dragStartPosition = Vector3.Zero();
    let dragPlane = new Plane(0, 1, 0, 0);

    container.onPointerDownObservable.add(() => {
      const current = markersRef.current.get(label.id);
      if (!current?.isSelected) {
        onLabelClick?.(label.id);
        return;
      }
      if (!scene) return;

      isDragging = true;
      hasMoved = false;
      dragStartPointer = { x: scene.pointerX, y: scene.pointerY };
      dragStartPosition = anchor.position.clone();

      const camera = scene.activeCamera;
      if (camera) {
        const normal = camera.getForwardRay().direction;
        dragPlane = Plane.FromPositionAndNormal(dragStartPosition, normal);
      }
    });

    container.onPointerMoveObservable.add(() => {
      if (!isDragging || !scene) return;

      const dx = scene.pointerX - dragStartPointer.x;
      const dy = scene.pointerY - dragStartPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        hasMoved = true;
      }
      if (!hasMoved) return;

      const camera = scene.activeCamera;
      if (!camera) return;

      const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), camera);
      const distance = ray.intersectsPlane(dragPlane);
      if (distance !== null) {
        anchor.position = ray.origin.add(ray.direction.scale(distance));
      }
    });

    container.onPointerUpObservable.add(() => {
      if (!isDragging) return;
      isDragging = false;
      if (hasMoved) {
        onLabelDragEnd?.(label.id, anchor.position);
      } else {
        onLabelClick?.(label.id);
      }
    });

    return { container, anchor, isSelected: !!label.isSelected };
  };

  // ========================================
  // Sync markers with labels
  // ========================================

  useEffect(() => {
    if (!guiTexture) return;

    const currentIds = new Set(labels.map((l) => l.id));
    const existingIds = new Set(markersRef.current.keys());

    // Remove stale markers
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          marker.container.dispose();
          marker.anchor.dispose();
          markersRef.current.delete(id);
        }
      }
    });

    // Add/update markers
    labels.forEach((label) => {
      const existing = markersRef.current.get(label.id);

      if (existing) {
        // Update existing marker
        existing.isSelected = !!label.isSelected;
        existing.anchor.position = label.position;
        existing.container.background = label.isSelected ? "#3b82f6" : "#1e293b";
        const text = existing.container.children[0] as TextBlock;
        if (text) text.text = label.name;
        const dot = existing.container.children[1] as Ellipse;
        if (dot) dot.background = label.isSelected ? "#3b82f6" : "#1e293b";
      } else {
        // Create new marker
        const marker = createMarker(guiTexture, label);
        markersRef.current.set(label.id, marker);
      }
    });
  }, [guiTexture, labels, selectedId, onLabelClick]);

  // ========================================
  // Cleanup
  // ========================================

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => {
        marker.container.dispose();
        marker.anchor.dispose();
      });
      markersRef.current.clear();
    };
  }, []);

  return {
    markers: markersRef.current,
  };
}
