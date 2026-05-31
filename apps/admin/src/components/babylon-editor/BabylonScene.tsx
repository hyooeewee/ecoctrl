// ========================================
// BabylonJS Core Scene Component
// ========================================

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  SceneLoader,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { fetchModelUrl } from "@/lib/babylon-loaders";

// ========================================
// Types
// ========================================

export interface BabylonSceneProps {
  src: string | null;
  alt?: string;
  onSceneReady?: (scene: Scene, engine: Engine) => void;
  onModelLoaded?: (rootNode: TransformNode) => void;
  className?: string;
}

export interface BabylonSceneRef {
  scene: Scene | null;
  engine: Engine | null;
  rootNode: TransformNode | null;
  guiTexture: AdvancedDynamicTexture | null;
}

// ========================================
// Component
// ========================================

const BabylonScene = forwardRef<BabylonSceneRef, BabylonSceneProps>(
  ({ src, alt, onSceneReady, onModelLoaded, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<ArcRotateCamera | null>(null);
    const rootNodeRef = useRef<TransformNode | null>(null);
    const guiTextureRef = useRef<AdvancedDynamicTexture | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Expose scene internals to parent
    useImperativeHandle(ref, () => ({
      get scene() {
        return sceneRef.current;
      },
      get engine() {
        return engineRef.current;
      },
      get rootNode() {
        return rootNodeRef.current;
      },
      get guiTexture() {
        return guiTextureRef.current;
      },
    }));

    // ========================================
    // Scene Initialization
    // ========================================

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const container = containerRef.current;

      // Create engine
      const engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      });
      engineRef.current = engine;

      // Create scene
      const scene = new Scene(engine);
      sceneRef.current = scene;

      // Setup camera
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

      // Setup lights
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.7;
      hemiLight.diffuse = new Color3(1, 1, 1);
      hemiLight.groundColor = new Color3(0.5, 0.5, 0.5);

      const dirLight = new DirectionalLight("dirLight", new Vector3(-1, -2, 1), scene);
      dirLight.intensity = 0.5;
      dirLight.position = new Vector3(5, 10, -5);

      // Setup grid
      createGrid(scene);

      // Setup GUI overlay
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("guiOverlay", true, scene);
      guiTextureRef.current = guiTexture;

      // Root node for model
      const rootNode = new TransformNode("modelRoot", scene);
      rootNodeRef.current = rootNode;

      // Render loop
      engine.runRenderLoop(() => {
        scene.render();
      });

      // Resize handling
      const resizeObserver = new ResizeObserver(() => {
        engine.resize();
      });
      resizeObserver.observe(container);

      // Notify parent
      onSceneReady?.(scene, engine);

      return () => {
        resizeObserver.disconnect();
        scene.dispose();
        engine.dispose();
        engineRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;
        rootNodeRef.current = null;
        guiTextureRef.current = null;
      };
    }, []);

    // ========================================
    // Model Loading
    // ========================================

    useEffect(() => {
      const scene = sceneRef.current;
      const engine = engineRef.current;
      const rootNode = rootNodeRef.current;

      if (!scene || !engine || !rootNode) return;

      // Clear previous model
      rootNode.getChildMeshes().forEach((mesh) => mesh.dispose());

      if (!src) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      let cancelled = false;
      let blobUrl: string | null = null;

      const loadModel = async () => {
        try {
          const url = await fetchModelUrl(src);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          blobUrl = url;
          const result = await SceneLoader.ImportMeshAsync(
            "", // mesh names (empty = all)
            "", // scene root (empty = use rootUrl)
            url, // blob URL from authenticated fetch
            scene,
            undefined,
            ".glb", // force GLB loader — blob URLs have no extension
          );

          if (cancelled) return;

          // Parent all loaded meshes to root node
          result.meshes.forEach((mesh) => {
            mesh.parent = rootNode;
          });

          setIsLoading(false);
          onModelLoaded?.(rootNode);
        } catch (err) {
          if (cancelled) return;
          console.error("Model load failed:", err);
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        }
      };

      loadModel();

      return () => {
        cancelled = true;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      };
    }, [src]);

    return (
      <div
        ref={containerRef}
        className={`relative flex h-full w-full overflow-hidden rounded-lg border border-border bg-black ${className ?? ""}`}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">加载模型中...</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm font-medium text-foreground">模型加载失败</p>
              <p className="max-w-xs text-xs text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Canvas */}
        <canvas ref={canvasRef} className="h-full w-full outline-none" />
      </div>
    );
  },
);

BabylonScene.displayName = "BabylonScene";

export default BabylonScene;

// ========================================
// Helpers
// ========================================

function createGrid(scene: Scene): void {
  const gridMaterial = new StandardMaterial("gridMat", scene);
  gridMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
  gridMaterial.alpha = 0.3;
  gridMaterial.backFaceCulling = false;

  const grid = MeshBuilder.CreateGround("grid", { width: 20, height: 20, subdivisions: 20 }, scene);
  grid.material = gridMaterial;
  grid.position.y = -0.01;
}
