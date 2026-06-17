// ========================================
// Label Marker Component (GUI Billboard)
// ========================================

import { useEffect, useRef } from "react";
import {
  Scene,
  Vector3,
  TransformNode,
  Color3,
  Mesh,
  MeshBuilder,
  PointerDragBehavior,
  StandardMaterial,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock, Ellipse, Rectangle } from "@babylonjs/gui";

export interface LabelMarkerData {
  id: string;
  key: string;
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
  const markersRef = useRef<Map<string, { container: Rectangle; anchor: TransformNode }>>(
    new Map(),
  );
  const dragMeshRef = useRef<Mesh | null>(null);
  const dragMaterialRef = useRef<StandardMaterial | null>(null);

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
    text.text = label.name || label.key;
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

    // Click handler
    container.onPointerDownObservable.add(() => {
      onLabelClick?.(label.id);
    });

    return { container, anchor };
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
        existing.anchor.position = label.position;
        existing.container.background = label.isSelected ? "#3b82f6" : "#1e293b";
        const text = existing.container.children[0] as TextBlock;
        if (text) text.text = label.name || label.key;
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
  // Draggable handle for selected label
  // ========================================

  useEffect(() => {
    if (!scene) return;

    // Clean up old drag mesh
    dragMeshRef.current?.dispose();
    dragMeshRef.current = null;

    if (!selectedId) return;

    const label = labels.find((l) => l.id === selectedId);
    if (!label) return;

    // Reuse material
    if (!dragMaterialRef.current) {
      const material = new StandardMaterial("dragHandleMaterial", scene);
      material.diffuseColor = new Color3(0.23, 0.51, 0.96);
      material.emissiveColor = new Color3(0.1, 0.3, 0.6);
      material.alpha = 0.6;
      dragMaterialRef.current = material;
    }

    const mesh = MeshBuilder.CreateSphere(`drag_${selectedId}`, { diameter: 0.4 }, scene);
    mesh.position = label.position.clone();
    mesh.material = dragMaterialRef.current;

    const dragBehavior = new PointerDragBehavior({});
    dragBehavior.useObjectOrientationForDragging = false;
    dragBehavior.onDragObservable.add(() => {
      const marker = markersRef.current.get(selectedId);
      if (marker) {
        marker.anchor.position = mesh.position.clone();
      }
    });
    dragBehavior.onDragEndObservable.add(() => {
      onLabelDragEnd?.(selectedId, mesh.position);
    });

    mesh.addBehavior(dragBehavior);
    dragMeshRef.current = mesh;

    return () => {
      dragMeshRef.current?.dispose();
      dragMeshRef.current = null;
    };
  }, [scene, selectedId, labels, onLabelDragEnd]);

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
      dragMeshRef.current?.dispose();
      dragMeshRef.current = null;
      dragMaterialRef.current?.dispose();
      dragMaterialRef.current = null;
    };
  }, []);

  return {
    markers: markersRef.current,
  };
}
