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
  type ISceneLoaderProgressEvent,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { fetchModelUrl } from "@/lib/babylon-loaders";

// ========================================
// Types
// ========================================

export interface ModelSource {
  id: string;
  url: string;
  visible: boolean;
}

export interface BabylonSceneProps {
  models: ModelSource[];
  showGrid?: boolean;
  showAxes?: boolean;
  alt?: string;
  onSceneReady?: (scene: Scene, engine: Engine) => void;
  onModelLoaded?: (rootNode: TransformNode) => void;
  onModelProgress?: (id: string, progress: number) => void;
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
  (
    {
      models,
      showGrid = true,
      showAxes = true,
      alt,
      onSceneReady,
      onModelLoaded,
      onModelProgress,
      className,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Engine | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<ArcRotateCamera | null>(null);
    const rootNodeRef = useRef<TransformNode | null>(null);
    const guiTextureRef = useRef<AdvancedDynamicTexture | null>(null);
    const loadedModelsRef = useRef<Map<string, { root: TransformNode; blobUrl: string }>>(
      new Map(),
    );
    const gridRef = useRef<ReturnType<typeof createGrid> | null>(null);
    const axesRef = useRef<ReturnType<typeof createAxes> | null>(null);

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

      // Setup grid & axes
      gridRef.current = createGrid(scene);
      axesRef.current = createAxes(scene);

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
      const camera = cameraRef.current;
      if (!scene || !engine) return;

      // Update visibility for already loaded models.
      loadedModelsRef.current.forEach((data, id) => {
        const model = models.find((m) => m.id === id);
        if (model) {
          data.root.setEnabled(model.visible);
        }
      });

      // Remove models that are no longer in the list.
      loadedModelsRef.current.forEach((data, id) => {
        if (!models.find((m) => m.id === id)) {
          data.root.dispose(false, true);
          URL.revokeObjectURL(data.blobUrl);
          loadedModelsRef.current.delete(id);
        }
      });

      // Load new visible models.
      const toLoad = models.filter((m) => m.visible && !loadedModelsRef.current.has(m.id));
      if (toLoad.length === 0) {
        frameCameraToVisibleModels(loadedModelsRef.current, models, camera, axesRef.current);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      let cancelled = false;

      const loadAll = async () => {
        try {
          for (const model of toLoad) {
            let lastProgress = -1;
            const onProgress = (event: ISceneLoaderProgressEvent) => {
              const progress = event.total > 0 ? event.loaded / event.total : 0;
              const rounded = Math.round(progress * 100) / 100;
              if (rounded !== lastProgress) {
                lastProgress = rounded;
                onModelProgress?.(model.id, rounded);
              }
            };

            const blobUrl = await fetchModelUrl(model.url);
            if (cancelled) {
              URL.revokeObjectURL(blobUrl);
              return;
            }

            const result = await SceneLoader.ImportMeshAsync(
              "", // mesh names (empty = all)
              "", // scene root (empty = use rootUrl)
              blobUrl, // blob URL from cache-backed fetch
              scene,
              onProgress,
              ".glb", // force GLB loader — blob URLs have no extension
            );

            if (cancelled) {
              URL.revokeObjectURL(blobUrl);
              return;
            }

            // Parent the GLTF __root__ to a per-model root node,
            // preserving full hierarchy.
            const modelRoot = new TransformNode(`model_${model.id}`, scene);
            const gltfRoot = result.transformNodes.find((tn) => tn.name === "__root__");
            if (gltfRoot) {
              gltfRoot.parent = modelRoot;
            } else {
              result.meshes.forEach((mesh) => {
                mesh.parent = modelRoot;
              });
            }

            loadedModelsRef.current.set(model.id, { root: modelRoot, blobUrl });
            onModelProgress?.(model.id, 1);
          }

          if (!cancelled) {
            setIsLoading(false);
            frameCameraToVisibleModels(loadedModelsRef.current, models, camera, axesRef.current);
            onModelLoaded?.(rootNodeRef.current!);
          }
        } catch (err) {
          if (cancelled) return;
          console.error("Model load failed:", err);
          setIsLoading(false);
          setHasError(true);
          setErrorMessage(err instanceof Error ? err.message : "Unknown error");
        }
      };

      loadAll();

      return () => {
        cancelled = true;
      };
    }, [models]);

    // ========================================
    // Grid / Axes Visibility
    // ========================================

    useEffect(() => {
      gridRef.current?.setEnabled(showGrid);
    }, [showGrid]);

    useEffect(() => {
      axesRef.current?.setEnabled(showAxes);
    }, [showAxes]);

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

function createGrid(scene: Scene) {
  const gridMaterial = new StandardMaterial("gridMat", scene);
  gridMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3);
  gridMaterial.alpha = 0.3;
  gridMaterial.backFaceCulling = false;

  const grid = MeshBuilder.CreateGround("grid", { width: 20, height: 20, subdivisions: 20 }, scene);
  grid.material = gridMaterial;
  grid.position.y = -0.01;
  return grid;
}

function createAxes(scene: Scene) {
  const root = new TransformNode("axesRoot", scene);

  const xMat = new StandardMaterial("axisXMat", scene);
  xMat.diffuseColor = new Color3(1, 0, 0);
  xMat.emissiveColor = new Color3(0.5, 0, 0);

  const yMat = new StandardMaterial("axisYMat", scene);
  yMat.diffuseColor = new Color3(0, 1, 0);
  yMat.emissiveColor = new Color3(0, 0.5, 0);

  const zMat = new StandardMaterial("axisZMat", scene);
  zMat.diffuseColor = new Color3(0, 0, 1);
  zMat.emissiveColor = new Color3(0, 0, 0.5);

  const xAxis = MeshBuilder.CreateCylinder("axisX", { height: 5, diameter: 0.02 }, scene);
  xAxis.rotation.z = Math.PI / 2;
  xAxis.position.x = 2.5;
  xAxis.material = xMat;
  xAxis.parent = root;

  const yAxis = MeshBuilder.CreateCylinder("axisY", { height: 5, diameter: 0.02 }, scene);
  yAxis.position.y = 2.5;
  yAxis.material = yMat;
  yAxis.parent = root;

  const zAxis = MeshBuilder.CreateCylinder("axisZ", { height: 5, diameter: 0.02 }, scene);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = 2.5;
  zAxis.material = zMat;
  zAxis.parent = root;

  return root;
}

function frameCameraToVisibleModels(
  loadedModels: Map<string, { root: TransformNode }>,
  models: ModelSource[],
  camera: ArcRotateCamera | null,
  axesRoot: TransformNode | null,
): void {
  if (!camera) return;

  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  let hasMesh = false;

  // Always include the origin so axes remain in view.
  min.minimizeInPlace(Vector3.Zero());
  max.maximizeInPlace(Vector3.Zero());

  models.forEach((model) => {
    if (!model.visible) return;
    const data = loadedModels.get(model.id);
    if (!data) return;

    data.root.getChildMeshes().forEach((mesh) => {
      const bi = mesh.getBoundingInfo();
      if (bi) {
        hasMesh = true;
        min.minimizeInPlace(bi.boundingBox.minimumWorld);
        max.maximizeInPlace(bi.boundingBox.maximumWorld);
      }
    });
  });

  const center = min.add(max).scale(0.5);
  const size = max.subtract(min);
  camera.setTarget(center);
  const diagonal = Math.max(size.x, size.y, size.z);
  if (diagonal > 0) {
    camera.radius = diagonal * 1.5;
    camera.lowerRadiusLimit = Math.max(0.1, diagonal * 0.1);
    camera.upperRadiusLimit = Math.max(100, diagonal * 5);
  }

  // Scale axes so they are clearly visible relative to the scene.
  if (axesRoot) {
    const scale = diagonal > 0 ? diagonal * 0.12 : 1;
    axesRoot.scaling = new Vector3(scale, scale, scale);
  }
}
