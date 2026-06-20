// ========================================
// BabylonJS Core Scene Component
// ========================================

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  Scene,
  ArcRotateCamera,
  Camera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  TransformNode,
  MeshBuilder,
  Mesh,
  StandardMaterial,
  AbstractMesh,
  Node,
  Animation,
  type ISceneLoaderProgressEvent,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { createEngine, loadGltf, loadModelsByPriority } from "@ecoctrl/shared/babylon";
import type { LabelAction } from "@ecoctrl/shared";
import { createOrientationGizmo } from "./orientation-gizmo";

// ========================================
// Types
// ========================================

export interface ModelSource {
  id: string;
  url: string;
  visible: boolean;
  priority?: "critical" | "background";
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
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  executeOperations: (actions: LabelAction[], signal?: AbortSignal) => Promise<void>;
  restorePreview: () => void;
  captureCameraView: () => {
    position: { x: number; y: number; z: number };
    lookAt: { x: number; y: number; z: number };
  };
  animateToView: (
    position: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
  ) => void;
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
    const previewSnapshotRef = useRef<SceneSnapshot | null>(null);
    const loadedModelsRef = useRef<
      Map<string, { root: TransformNode; modelUrl: string; meshes: AbstractMesh[] }>
    >(new Map());
    const loadingIdsRef = useRef<Set<string>>(new Set());
    const modelsRef = useRef<ModelSource[]>(models);
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
      zoomIn() {
        const camera = cameraRef.current;
        if (!camera || camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) return;
        const factor = 0.9;
        camera.orthoLeft *= factor;
        camera.orthoRight *= factor;
        camera.orthoTop *= factor;
        camera.orthoBottom *= factor;
      },
      zoomOut() {
        const camera = cameraRef.current;
        if (!camera || camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) return;
        const factor = 1.1;
        camera.orthoLeft *= factor;
        camera.orthoRight *= factor;
        camera.orthoTop *= factor;
        camera.orthoBottom *= factor;
      },
      resetView() {
        frameCameraToVisibleModels(
          loadedModelsRef.current,
          modelsRef.current,
          cameraRef.current,
          axesRef.current,
        );
      },
      captureCameraView() {
        const camera = cameraRef.current;
        if (!camera) return { position: { x: 0, y: 10, z: -10 }, lookAt: { x: 0, y: 0, z: 0 } };
        // ArcRotateCamera position = target + spherical offset
        const target = camera.target;
        const pos = camera.position;
        return {
          position: { x: +pos.x.toFixed(2), y: +pos.y.toFixed(2), z: +pos.z.toFixed(2) },
          lookAt: { x: +target.x.toFixed(2), y: +target.y.toFixed(2), z: +target.z.toFixed(2) },
        };
      },
      animateToView(position, lookAt) {
        const camera = cameraRef.current;
        const scene = sceneRef.current;
        if (!camera || !scene) return;
        const pos = new Vector3(position.x, position.y, position.z);
        const target = new Vector3(lookAt.x, lookAt.y, lookAt.z);
        const dir = target.subtract(pos);
        const radius = dir.length();
        const alpha = Math.atan2(dir.x, dir.z);
        const hDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        const beta = Math.max(0.1, Math.min(Math.PI - 0.1, Math.atan2(hDist, dir.y)));
        const frameCount = 30;
        const anims: Animation[] = [];
        const alphaA = new Animation(
          "a",
          "alpha",
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        alphaA.setKeys([
          { frame: 0, value: camera.alpha },
          { frame: frameCount, value: alpha },
        ]);
        anims.push(alphaA);
        const betaA = new Animation(
          "b",
          "beta",
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        betaA.setKeys([
          { frame: 0, value: camera.beta },
          { frame: frameCount, value: beta },
        ]);
        anims.push(betaA);
        const radiusA = new Animation(
          "r",
          "radius",
          60,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        radiusA.setKeys([
          { frame: 0, value: camera.radius },
          { frame: frameCount, value: radius },
        ]);
        anims.push(radiusA);
        const targetA = new Animation(
          "t",
          "target",
          60,
          Animation.ANIMATIONTYPE_VECTOR3,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        targetA.setKeys([
          { frame: 0, value: camera.target.clone() },
          { frame: frameCount, value: target },
        ]);
        anims.push(targetA);
        scene.beginDirectAnimation(camera, anims, 0, frameCount, false, 1);
      },
      async executeOperations(actions: LabelAction[], signal?: AbortSignal) {
        const camera = cameraRef.current;
        const scene = sceneRef.current;
        if (!camera || !scene) return;

        const snapshot = captureSceneSnapshot(camera, loadedModelsRef.current);

        const throwIfAborted = () => {
          if (signal?.aborted) throw new Error("aborted");
        };

        try {
          for (const action of actions) {
            throwIfAborted();
            switch (action.type) {
              case "camera": {
                const cfg = action.config as {
                  position: { x: number; y: number; z: number };
                  lookAt: { x: number; y: number; z: number };
                  duration: number;
                  easing?: string;
                };
                const pos = new Vector3(cfg.position.x, cfg.position.y, cfg.position.z);
                const lookAt = new Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
                const duration = cfg.duration ?? 0.8;
                const frameCount = Math.max(1, Math.round(duration * 60));

                // Convert position + lookAt → ArcRotateCamera params
                const direction = lookAt.subtract(pos);
                const radius = direction.length();
                const targetAlpha = Math.atan2(direction.x, direction.z);
                const hDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
                const targetBeta = Math.max(
                  0.1,
                  Math.min(Math.PI - 0.1, Math.atan2(hDist, direction.y)),
                );

                const alphaAnim = new Animation(
                  "cameraAlphaAnim",
                  "alpha",
                  60,
                  Animation.ANIMATIONTYPE_FLOAT,
                  Animation.ANIMATIONLOOPMODE_CONSTANT,
                );
                alphaAnim.setKeys([
                  { frame: 0, value: camera.alpha },
                  { frame: frameCount, value: targetAlpha },
                ]);

                const betaAnim = new Animation(
                  "cameraBetaAnim",
                  "beta",
                  60,
                  Animation.ANIMATIONTYPE_FLOAT,
                  Animation.ANIMATIONLOOPMODE_CONSTANT,
                );
                betaAnim.setKeys([
                  { frame: 0, value: camera.beta },
                  { frame: frameCount, value: targetBeta },
                ]);

                const radiusAnim = new Animation(
                  "cameraRadiusAnim",
                  "radius",
                  60,
                  Animation.ANIMATIONTYPE_FLOAT,
                  Animation.ANIMATIONLOOPMODE_CONSTANT,
                );
                radiusAnim.setKeys([
                  { frame: 0, value: camera.radius },
                  { frame: frameCount, value: radius },
                ]);

                const targetAnim = new Animation(
                  "cameraTargetAnim",
                  "target",
                  60,
                  Animation.ANIMATIONTYPE_VECTOR3,
                  Animation.ANIMATIONLOOPMODE_CONSTANT,
                );
                targetAnim.setKeys([
                  { frame: 0, value: camera.target.clone() },
                  { frame: frameCount, value: lookAt },
                ]);

                scene.beginDirectAnimation(
                  camera,
                  [alphaAnim, betaAnim, radiusAnim, targetAnim],
                  0,
                  frameCount,
                  false,
                  1,
                );
                await new Promise<void>((resolve, reject) => {
                  const timeout = setTimeout(resolve, duration * 1000);
                  if (!signal) return;
                  const onAbort = () => {
                    clearTimeout(timeout);
                    scene.stopAnimation(camera);
                    reject(new Error("aborted"));
                  };
                  if (signal.aborted) {
                    onAbort();
                    return;
                  }
                  signal.addEventListener("abort", onAbort, { once: true });
                });
                break;
              }
              case "clipping":
                console.warn("[BabylonScene] clipping execution not implemented in admin preview");
                break;
              case "visibility": {
                await executeVisibility(action, loadedModelsRef.current, signal);
                break;
              }
              case "postprocess":
                console.warn(
                  "[BabylonScene] postprocess execution not implemented in admin preview",
                );
                break;
              case "highlight": {
                const cfg = action.config as {
                  targets?: string[];
                  mode: string;
                  color?: { r: number; g: number; b: number };
                };
                const keywords = (cfg.targets ?? [])
                  .map((k: string) => k.toLowerCase())
                  .filter(Boolean);

                loadedModelsRef.current.forEach(({ meshes }) => {
                  meshes.forEach((mesh) => {
                    const nameToCheck = mesh.name.toLowerCase();
                    const isMatch =
                      keywords.length === 0 || keywords.some((k) => nameToCheck.includes(k));
                    if (!isMatch) return;

                    switch (cfg.mode) {
                      case "outline":
                        mesh.renderOutline = true;
                        mesh.outlineWidth = 0.05;
                        mesh.outlineColor = new Color3(
                          cfg.color?.r ?? 1,
                          cfg.color?.g ?? 1,
                          cfg.color?.b ?? 0,
                        );
                        break;
                      case "glow":
                        if (mesh.material) {
                          (mesh as any).__origEmissive = (
                            mesh.material as any
                          ).emissiveColor?.clone();
                          (mesh.material as any).emissiveColor = new Color3(
                            cfg.color?.r ?? 0.3,
                            cfg.color?.g ?? 0.3,
                            cfg.color?.b ?? 0.3,
                          );
                        }
                        break;
                      case "color":
                        if (mesh.material) {
                          (mesh as any).__origDiffuse = (
                            mesh.material as any
                          ).diffuseColor?.clone();
                          (mesh.material as any).diffuseColor = new Color3(
                            cfg.color?.r ?? 1,
                            cfg.color?.g ?? 0.8,
                            cfg.color?.b ?? 0,
                          );
                        }
                        break;
                    }
                  });
                });
                break;
              }

              case "explode": {
                const cfg = action.config as {
                  axis: { x: number; y: number; z: number };
                  distance: number;
                  targets?: string[];
                };
                const axis = new Vector3(cfg.axis.x, cfg.axis.y, cfg.axis.z).normalize();
                const keywords = (cfg.targets ?? [])
                  .map((k: string) => k.toLowerCase())
                  .filter(Boolean);

                loadedModelsRef.current.forEach(({ meshes }) => {
                  meshes.forEach((mesh) => {
                    if (keywords.length > 0) {
                      const nameToCheck = mesh.name.toLowerCase();
                      const isMatch = keywords.some((k) => nameToCheck.includes(k));
                      if (!isMatch) return;
                    }
                    if (!(mesh as any).__origPosition) {
                      (mesh as any).__origPosition = mesh.position.clone();
                    }
                    const offset = axis.scale(cfg.distance);
                    mesh.position = (mesh as any).__origPosition.add(offset);
                  });
                });
                break;
              }

              case "material": {
                const cfg = action.config as {
                  targets?: string[];
                  property: string;
                  value: number | boolean;
                };
                const keywords = (cfg.targets ?? [])
                  .map((k: string) => k.toLowerCase())
                  .filter(Boolean);

                loadedModelsRef.current.forEach(({ meshes }) => {
                  meshes.forEach((mesh) => {
                    const nameToCheck = mesh.name.toLowerCase();
                    const isMatch =
                      keywords.length === 0 || keywords.some((k) => nameToCheck.includes(k));
                    if (!isMatch) return;

                    const mat = mesh.material as any;
                    if (!mat) return;

                    switch (cfg.property) {
                      case "opacity":
                        if (!(mesh as any).__origVisibility) {
                          (mesh as any).__origVisibility = mesh.visibility;
                        }
                        mesh.visibility = cfg.value as number;
                        break;
                      case "emissive":
                        if (!mat.__origEmissive) {
                          mat.__origEmissive = mat.emissiveColor?.clone();
                        }
                        mat.emissiveColor = new Color3(
                          cfg.value as number,
                          cfg.value as number,
                          cfg.value as number,
                        );
                        break;
                      case "wireframe":
                        if (mat.__origWireframe === undefined) {
                          mat.__origWireframe = mat.wireframe;
                        }
                        mat.wireframe = cfg.value as boolean;
                        break;
                    }
                  });
                });
                break;
              }

              case "label": {
                // Label control doesn't affect the 3D scene — it controls the React overlay.
                // In admin preview, just log it.
                console.log("[BabylonScene] label control action (preview only):", action.config);
                break;
              }

              default:
                break;
            }
          }
        } finally {
          // Store snapshot for manual restore via restorePreview()
          previewSnapshotRef.current = snapshot;
        }
      },
      restorePreview() {
        const camera = cameraRef.current;
        const snapshot = previewSnapshotRef.current;
        if (!camera || !snapshot) return;
        restoreSceneSnapshot(camera, snapshot);
        previewSnapshotRef.current = null;
      },
    }));

    // ========================================
    // Scene Initialization
    // ========================================

    useEffect(() => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const container = containerRef.current;

      // Create engine and scene
      const engine = createEngine(canvas);
      engineRef.current = engine;

      // Reduce render resolution to 50% to ease GPU fragment-shader load
      // for heavy PBR scenes with multiple large GLB models.
      engine.setHardwareScalingLevel(0.5);

      // Cap texture size if the engine supports it (tree-shaking may drop ThinEngine method).
      if (typeof (engine as any).setMaximumTextureSize === "function") {
        (engine as any).setMaximumTextureSize(1024);
      }

      const scene = new Scene(engine);
      sceneRef.current = scene;
      // Ambient light so PBR materials are visible even before textures compile.
      scene.ambientColor = new Color3(0.4, 0.4, 0.4);

      // Setup camera in orthographic mode for a true axonometric view.
      const camera = new ArcRotateCamera(
        "camera",
        Math.PI / 4,
        Math.acos(1 / Math.sqrt(3)),
        30,
        Vector3.Zero(),
        scene,
      );
      camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
      camera.attachControl(canvas, true);
      camera.minZ = 0.1;
      camera.maxZ = 1000;
      camera.lowerRadiusLimit = 1;
      camera.upperRadiusLimit = 500;
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

      // Disable per-frame raycast picking — admin scene does not need hover detection.
      scene.skipPointerMovePicking = true;

      // Setup GUI overlay
      const guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("guiOverlay", true, scene);
      guiTextureRef.current = guiTexture;

      // Root node for model
      const rootNode = new TransformNode("modelRoot", scene);
      rootNodeRef.current = rootNode;

      // Interaction-aware render loop: full 60fps while user interacts,
      // throttled to 10fps when idle to save GPU/CPU for static scenes.
      const isInteracting = { current: false };
      let idleTimer: ReturnType<typeof setTimeout> | null = null;
      const IDLE_INTERVAL = 100; // ms between frames when idle (10fps)
      let lastRenderTime = 0;

      const markInteracting = () => {
        isInteracting.current = true;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          isInteracting.current = false;
        }, 150);
      };

      canvas.addEventListener("pointerdown", markInteracting);
      canvas.addEventListener("pointermove", markInteracting);
      canvas.addEventListener("pointerup", markInteracting);
      canvas.addEventListener("wheel", markInteracting, { passive: true });

      engine.runRenderLoop(() => {
        const now = performance.now();
        if (!isInteracting.current && now - lastRenderTime < IDLE_INTERVAL) {
          return;
        }
        lastRenderTime = now;
        scene.render();
      });

      // Resize handling
      const resizeObserver = new ResizeObserver(() => {
        engine.resize();
      });
      resizeObserver.observe(container);

      // Notify parent
      onSceneReady?.(scene, engine);

      // Orientation gizmo (CAD-style cube in top-right corner)
      const gizmo = createOrientationGizmo(engine, camera, container, {
        onViewChange: (pos, lookAt) => {
          // Animate the main camera to the selected view
          const dir = lookAt.subtract(pos);
          const radius = dir.length();
          const alpha = Math.atan2(dir.x, dir.z);
          const hDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
          const beta = Math.max(0.1, Math.min(Math.PI - 0.1, Math.atan2(hDist, dir.y)));
          const frameCount = 20;

          const alphaA = new Animation(
            "a",
            "alpha",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          alphaA.setKeys([
            { frame: 0, value: camera.alpha },
            { frame: frameCount, value: alpha },
          ]);
          const betaA = new Animation(
            "b",
            "beta",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          betaA.setKeys([
            { frame: 0, value: camera.beta },
            { frame: frameCount, value: beta },
          ]);
          const radiusA = new Animation(
            "r",
            "radius",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          radiusA.setKeys([
            { frame: 0, value: camera.radius },
            { frame: frameCount, value: radius },
          ]);
          const targetA = new Animation(
            "t",
            "target",
            60,
            Animation.ANIMATIONTYPE_VECTOR3,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          targetA.setKeys([
            { frame: 0, value: camera.target.clone() },
            { frame: frameCount, value: lookAt },
          ]);

          scene.beginDirectAnimation(
            camera,
            [alphaA, betaA, radiusA, targetA],
            0,
            frameCount,
            false,
            1,
          );
        },
      });

      return () => {
        gizmo.dispose();
        canvas.removeEventListener("pointerdown", markInteracting);
        canvas.removeEventListener("pointermove", markInteracting);
        canvas.removeEventListener("pointerup", markInteracting);
        canvas.removeEventListener("wheel", markInteracting);
        if (idleTimer) clearTimeout(idleTimer);
        resizeObserver.disconnect();
        loadedModelsRef.current.forEach((data) => {
          data.root.dispose(false, true);
        });
        loadedModelsRef.current.clear();
        loadingIdsRef.current.clear();
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

    // Keep modelsRef in sync so resetView always uses latest list.
    useEffect(() => {
      modelsRef.current = models;
    }, [models]);

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
          loadedModelsRef.current.delete(id);
        }
      });

      // Clear stale loading IDs from a previous cancelled load cycle
      // so models that were mid-flight can be re-queued.
      loadingIdsRef.current.clear();

      // Load new visible models.
      const toLoad = models.filter(
        (m) => m.visible && !loadedModelsRef.current.has(m.id) && !loadingIdsRef.current.has(m.id),
      );
      if (toLoad.length === 0) {
        frameCameraToVisibleModels(loadedModelsRef.current, models, camera, axesRef.current);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      let cancelled = false;

      const loadAll = async () => {
        // Load a single model into the scene.
        const loadSingleModel = async (model: ModelSource): Promise<void> => {
          if (
            cancelled ||
            loadedModelsRef.current.has(model.id) ||
            loadingIdsRef.current.has(model.id)
          ) {
            return;
          }

          loadingIdsRef.current.add(model.id);
          let lastProgress = -1;
          const onProgress = (event: ISceneLoaderProgressEvent) => {
            const progress = event.total > 0 ? event.loaded / event.total : 0;
            const rounded = Math.round(progress * 100) / 100;
            if (rounded !== lastProgress) {
              lastProgress = rounded;
              onModelProgress?.(model.id, rounded);
            }
          };

          let result: Awaited<ReturnType<typeof loadGltf>>;
          try {
            result = await loadGltf({
              scene,
              url: model.url,
              modelId: model.id,
              useBlob: false,
              forceExtension: ".glb",
              compileMaterials: false,
              onProgress,
            });
          } catch (err) {
            loadingIdsRef.current.delete(model.id);
            throw err;
          }

          if (cancelled) {
            result.modelRoot.dispose(false, true);
            loadingIdsRef.current.delete(model.id);
            return;
          }

          // Merge meshes by material to drastically reduce draw calls
          // (one draw call per material instead of one per mesh).
          const mergeable = result.meshes.filter(
            (m): m is Mesh => m instanceof Mesh && !(m as any).isAnInstance,
          );
          if (mergeable.length > 1) {
            try {
              const merged = Mesh.MergeMeshes(mergeable, true, true, undefined, true, true);
              if (merged) {
                merged.parent = result.modelRoot;
                // MergeMeshes discards original mesh names; preserve them so
                // visibility actions can still match by keyword.
                merged.metadata = {
                  ...merged.metadata,
                  originalMeshNames: mergeable.map((m) => m.name),
                };
                result.meshes = [merged];
              }
            } catch {
              /* merge failed — keep original meshes */
            }
          }

          // Freeze world matrices for static building meshes so BabylonJS
          // skips per-frame matrix recomputation.
          result.meshes.forEach((mesh) => {
            if ((mesh as any).freezeWorldMatrix) {
              mesh.freezeWorldMatrix();
            }
          });

          loadedModelsRef.current.set(model.id, {
            root: result.modelRoot,
            modelUrl: result.sourceUrl,
            meshes: result.meshes,
          });
          onModelProgress?.(model.id, 1);
          loadingIdsRef.current.delete(model.id);
        };

        try {
          await loadModelsByPriority({
            models: toLoad,
            loadFn: loadSingleModel,
            parallel: false,
            onCriticalDone: async () => {
              if (cancelled) return;
              // Force a render so BabylonJS compiles shaders and the mesh becomes
              // visible before we hide the loading overlay.
              scene.render();
              await new Promise((resolve) => requestAnimationFrame(resolve));
              setIsLoading(false);
              frameCameraToVisibleModels(loadedModelsRef.current, models, camera, axesRef.current);
              onModelLoaded?.(rootNodeRef.current!);
            },
            onBackgroundError: (model, err) => {
              console.warn(`Background model "${model.id}" load failed:`, err);
              loadingIdsRef.current.delete(model.id);
            },
            isCancelled: () => cancelled,
          });
        } catch (err) {
          if (cancelled) return;
          console.error("Critical model load failed:", err);
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
        className={`relative flex h-full w-full overflow-hidden bg-black ${className ?? ""}`}
      >
        {/* Loading overlay — z-0 stays below panel (z-10); pointer-events-none lets
             clicks pass through to the panel. */}
        {isLoading && (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-black/50">
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">加载模型中...</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
            <div className="pointer-events-auto flex flex-col items-center gap-3 text-center">
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
  loadedModels: Map<string, { root: TransformNode; meshes: AbstractMesh[] }>,
  models: ModelSource[],
  camera: ArcRotateCamera | null,
  axesRoot: TransformNode | null,
): void {
  if (!camera) return;

  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);

  // Always include the origin so axes remain in view.
  min.minimizeInPlace(Vector3.Zero());
  max.maximizeInPlace(Vector3.Zero());

  models.forEach((model) => {
    if (!model.visible) return;
    const data = loadedModels.get(model.id);
    if (!data) return;

    // Force update world matrices from root down before reading bounds.
    // Parenting gltfRoot under modelRoot dirties the whole hierarchy;
    // without this, minimumWorld/maximumWorld are stale.
    const stack: Node[] = [data.root];
    while (stack.length > 0) {
      const node = stack.shift()!;
      node.computeWorldMatrix(true);
      stack.push(...node.getChildren());
    }

    data.meshes.forEach((mesh) => {
      const bi = mesh.getBoundingInfo();
      if (bi) {
        min.minimizeInPlace(bi.boundingBox.minimumWorld);
        max.maximizeInPlace(bi.boundingBox.maximumWorld);
      }
    });
  });

  // Frame around the coordinate axes origin with a fixed isometric
  // orthographic view rather than chasing the model bounds.
  camera.setTarget(Vector3.Zero());
  camera.alpha = Math.PI / 4;
  camera.beta = Math.acos(1 / Math.sqrt(3));
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 500;

  // Ensure the camera sits outside the model so the near plane does not
  // clip the front-facing geometry.
  const maxCornerDist = Math.max(min.length(), max.length());
  camera.radius = Math.max(30, maxCornerDist * 1.5);

  // Scale axes so they are clearly visible relative to the scene.
  const size = max.subtract(min);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (axesRoot) {
    const scale = maxDim > 0 ? maxDim * 0.12 : 1;
    axesRoot.scaling = new Vector3(scale, scale, scale);
  }

  // Orthographic frustum: compute view-space bounds so the frustum exactly
  // contains the bounding box regardless of camera angle.
  const viewMatrix = camera.getViewMatrix();
  const corners = [
    new Vector3(min.x, min.y, min.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, max.y, max.z),
  ];

  let maxViewCoord = 0;
  for (const corner of corners) {
    const viewPos = Vector3.TransformCoordinates(corner, viewMatrix);
    maxViewCoord = Math.max(maxViewCoord, Math.abs(viewPos.x), Math.abs(viewPos.y));
  }

  const padding = 1.2;
  const orthoExtent = Math.max(10, maxViewCoord * padding);
  camera.orthoLeft = -orthoExtent;
  camera.orthoRight = orthoExtent;
  camera.orthoTop = orthoExtent;
  camera.orthoBottom = -orthoExtent;
}

// ========================================
// Operation Helpers
// ========================================

interface VisibilityConfig {
  targets: string[];
  action: "show" | "hide" | "toggle";
  duration?: number;
}

async function executeVisibility(
  action: { type: string; config: Record<string, unknown> },
  loadedModels: Map<string, { root: TransformNode; modelUrl: string; meshes: AbstractMesh[] }>,
  signal?: AbortSignal,
) {
  const config = action.config as unknown as VisibilityConfig;
  const keywords = (config.targets ?? []).map((k: string) => k.toLowerCase()).filter(Boolean);

  loadedModels.forEach(({ meshes, modelUrl }, id) => {
    if (signal?.aborted) return;

    const modelBasename = modelUrl.split("/").pop()?.toLowerCase() ?? "";
    meshes.forEach((mesh) => {
      if (signal?.aborted) return;
      const originalNames: string[] = Array.isArray(mesh.metadata?.originalMeshNames)
        ? mesh.metadata.originalMeshNames
        : [];
      const namesToCheck = [mesh.name, ...originalNames].map((n) => n.toLowerCase());
      const isMatch =
        keywords.length === 0 ||
        keywords.some(
          (k) =>
            namesToCheck.some((n) => n.includes(k)) ||
            id.toLowerCase().includes(k) ||
            modelBasename.includes(k),
        );

      if (!isMatch) return;

      const current = mesh.isVisible ?? true;
      let next: boolean;
      switch (config.action) {
        case "hide":
          next = false;
          break;
        case "show":
          next = true;
          break;
        case "toggle":
        default:
          next = !current;
          break;
      }
      mesh.setEnabled(next);
      mesh.isVisible = next;
    });
  });

  // Hold the visibility state for the configured duration so the preview
  // is actually visible to the user. Without this, the snapshot is restored
  // in the same frame and the hide/show effect is imperceptible.
  const durationMs = Math.max(0, (config.duration ?? 0.3) * 1000);
  if (durationMs > 0) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("aborted"));
        return;
      }
      const timeout = setTimeout(resolve, durationMs);
      if (!signal) return;
      const onAbort = () => {
        clearTimeout(timeout);
        reject(new Error("aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}

// ========================================
// Scene Snapshot Helpers
// ========================================

interface SceneSnapshot {
  camera: {
    target: Vector3;
    radius: number;
    alpha: number;
    beta: number;
    orthoLeft: number;
    orthoRight: number;
    orthoTop: number;
    orthoBottom: number;
  };
  meshes: Array<{
    mesh: AbstractMesh;
    isVisible: boolean;
    isEnabled: boolean;
  }>;
}

function captureSceneSnapshot(
  camera: ArcRotateCamera,
  loadedModels: Map<string, { root: TransformNode; modelUrl: string; meshes: AbstractMesh[] }>,
): SceneSnapshot {
  const meshes: SceneSnapshot["meshes"] = [];
  loadedModels.forEach(({ meshes: modelMeshes }) => {
    modelMeshes.forEach((mesh) => {
      meshes.push({
        mesh,
        isVisible: mesh.isVisible,
        isEnabled: mesh.isEnabled(),
      });
    });
  });

  return {
    camera: {
      target: camera.target.clone(),
      radius: camera.radius,
      alpha: camera.alpha,
      beta: camera.beta,
      orthoLeft: camera.orthoLeft,
      orthoRight: camera.orthoRight,
      orthoTop: camera.orthoTop,
      orthoBottom: camera.orthoBottom,
    },
    meshes,
  };
}

function restoreSceneSnapshot(camera: ArcRotateCamera, snapshot: SceneSnapshot) {
  snapshot.meshes.forEach(({ mesh, isVisible, isEnabled }) => {
    mesh.setEnabled(isEnabled);
    mesh.isVisible = isVisible;

    // Restore highlight outlines
    mesh.renderOutline = false;

    // Restore explode positions
    if ((mesh as any).__origPosition) {
      mesh.position = (mesh as any).__origPosition;
      delete (mesh as any).__origPosition;
    }

    // Restore material properties
    const mat = mesh.material as any;
    if (mat) {
      if (mat.__origEmissive) {
        mat.emissiveColor = mat.__origEmissive;
        delete mat.__origEmissive;
      }
      if (mat.__origDiffuse) {
        mat.diffuseColor = mat.__origDiffuse;
        delete mat.__origDiffuse;
      }
      if (mat.__origWireframe !== undefined) {
        mat.wireframe = mat.__origWireframe;
        delete mat.__origWireframe;
      }
    }
    if ((mesh as any).__origVisibility !== undefined) {
      mesh.visibility = (mesh as any).__origVisibility;
      delete (mesh as any).__origVisibility;
    }
  });

  camera.target = snapshot.camera.target;
  camera.radius = snapshot.camera.radius;
  camera.alpha = snapshot.camera.alpha;
  camera.beta = snapshot.camera.beta;
  camera.orthoLeft = snapshot.camera.orthoLeft;
  camera.orthoRight = snapshot.camera.orthoRight;
  camera.orthoTop = snapshot.camera.orthoTop;
  camera.orthoBottom = snapshot.camera.orthoBottom;
}
