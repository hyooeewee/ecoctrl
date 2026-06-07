import { RotateCcw, Maximize2, AlertTriangle, Download } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  SceneLoader,
  TransformNode,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { fetchModelUrl } from "@ecoctrl/shared/model-cache";

import AppButton from "@/components/AppButton";

interface ModelViewerProps {
  src: string | null;
  alt?: string;
  format: string | null;
}

const PREVIEWABLE_FORMATS = new Set(["GLB", "GLTF", "GLTF (zip)"]);

export default function ModelViewer({ src, alt, format }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const autoRotateRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const canPreview = PREVIEWABLE_FORMATS.has((format ?? "").toUpperCase());

  // Initialize BabylonJS engine + scene
  useEffect(() => {
    if (!canPreview || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(0, 0, 0, 0);

    // Camera
    const camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 4,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    camera.lowerRadiusLimit = 1;
    camera.upperRadiusLimit = 100;
    camera.wheelPrecision = 50;
    cameraRef.current = camera;

    // Lights
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7;
    hemi.diffuse = new Color3(1, 1, 1);
    hemi.groundColor = new Color3(0.5, 0.5, 0.5);

    const dir = new DirectionalLight("dir", new Vector3(-1, -2, 1), scene);
    dir.intensity = 0.5;
    dir.position = new Vector3(5, 10, -5);

    // Auto-rotate
    scene.registerBeforeRender(() => {
      if (autoRotateRef.current && cameraRef.current) {
        cameraRef.current.alpha += 0.003;
      }
    });

    // Render loop
    engine.runRenderLoop(() => scene.render());

    // Resize handling
    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(container);

    return () => {
      ro.disconnect();
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [canPreview]);

  // Load model when src changes
  useEffect(() => {
    const scene = sceneRef.current;
    const engine = engineRef.current;
    const camera = cameraRef.current;
    if (!scene || !engine || !camera || !src) return;

    setIsLoading(true);
    setHasError(false);
    autoRotateRef.current = true;

    // Clear previous model
    scene.transformNodes.filter((n) => n.name === "modelRoot").forEach((n) => n.dispose());

    const rootNode = new TransformNode("modelRoot", scene);
    let cancelled = false;
    let blobUrl: string | null = null;

    fetchModelUrl(src)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return null;
        }
        blobUrl = url;
        return SceneLoader.ImportMeshAsync("", "", url, scene, undefined, ".glb");
      })
      .then((result) => {
        if (cancelled || !result) return;

        result.meshes.forEach((mesh) => {
          mesh.parent = rootNode;
        });

        // Fit camera to model
        fitCameraToModel(camera, rootNode);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Model load failed:", err);
        setIsLoading(false);
        setHasError(true);
      });

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  const handleReset = () => {
    const camera = cameraRef.current;
    if (!camera) return;
    autoRotateRef.current = true;
    fitCameraToModel(camera, camera.getScene().transformNodes.find((n) => n.name === "modelRoot")!);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  // Stop auto-rotate on user interaction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stop = () => {
      autoRotateRef.current = false;
    };
    canvas.addEventListener("pointerdown", stop);
    return () => canvas.removeEventListener("pointerdown", stop);
  }, []);

  if (!canPreview) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted">
        <AlertTriangle size={48} className="text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">该格式暂不支持在线预览</p>
          <p className="mt-1 text-xs text-muted-foreground">
            格式: {format}（仅 GLB/GLTF 支持3D预览）
          </p>
        </div>
        {src && (
          <a
            href={src}
            download
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download size={16} />
            下载模型文件
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-black"
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <AppButton
          level="ghost"
          size="icon-sm"
          className="h-8 w-8 border bg-background/80 backdrop-blur-sm"
          onClick={handleReset}
          title="重置视角"
        >
          <RotateCcw size={14} />
        </AppButton>
        <AppButton
          level="ghost"
          size="icon-sm"
          className="h-8 w-8 border bg-background/80 backdrop-blur-sm"
          onClick={toggleFullscreen}
          title="全屏"
        >
          <Maximize2 size={14} />
        </AppButton>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {hasError && (
        <div className="absolute inset-0 z-0 flex items-center justify-center text-sm text-red-400">
          模型加载失败，请检查文件是否有效
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} className="h-full w-full outline-none" />
    </div>
  );
}

// ========================================
// Helpers
// ========================================

function fitCameraToModel(camera: ArcRotateCamera, rootNode: TransformNode): void {
  const meshes = rootNode.getChildMeshes();
  if (meshes.length === 0) return;

  let min = new Vector3(Infinity, Infinity, Infinity);
  let max = new Vector3(-Infinity, -Infinity, -Infinity);

  for (const mesh of meshes) {
    const bb = mesh.getBoundingInfo().boundingBox;
    min = Vector3.Minimize(min, bb.minimumWorld);
    max = Vector3.Maximize(max, bb.maximumWorld);
  }

  const center = Vector3.Center(min, max);
  const size = max.subtract(min);
  const maxDim = Math.max(size.x, size.y, size.z);

  camera.target = center;
  camera.radius = (maxDim / 2 / Math.tan(camera.fov / 2)) * 1.5;
}
