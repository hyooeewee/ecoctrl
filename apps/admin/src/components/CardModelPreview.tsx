import React, { useEffect, useRef } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  SceneLoader,
  TransformNode,
} from "@babylonjs/core";
import "@babylonjs/loaders";

interface CardModelPreviewProps {
  src: string;
  alt?: string;
}

/**
 * Lightweight BabylonJS preview for model cards.
 * Renders a small auto-rotating 3D model thumbnail with no user controls.
 */
export default function CardModelPreview({ src, alt: _alt }: CardModelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);

    const camera = new ArcRotateCamera("cam", -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.maxZ = 1000;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7;
    hemi.diffuse = new Color3(1, 1, 1);
    hemi.groundColor = new Color3(0.5, 0.5, 0.5);

    const rootNode = new TransformNode("root", scene);

    // Auto-rotate
    scene.registerBeforeRender(() => {
      camera.alpha += 0.003;
    });

    SceneLoader.ImportMeshAsync("", "", src, scene)
      .then((result) => {
        result.meshes.forEach((m) => {
          m.parent = rootNode;
        });
        fitCamera(camera, rootNode);
      })
      .catch(() => {
        // Silently ignore — card just shows nothing
      });

    engine.runRenderLoop(() => scene.render());

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      scene.dispose();
      engine.dispose();
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none h-full w-full"
      style={{ backgroundColor: "transparent" }}
    />
  );
}

function fitCamera(camera: ArcRotateCamera, root: TransformNode): void {
  const meshes = root.getChildMeshes();
  if (meshes.length === 0) return;

  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);

  for (const mesh of meshes) {
    const bb = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bb.minimumWorld);
    max = Vector3.Maximize(max, bb.maximumWorld);
  }

  camera.target = Vector3.Center(min, max);
  const maxDim = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  camera.radius = (maxDim / 2 / Math.tan(camera.fov / 2)) * 1.5;
}
