import {
  AbstractMesh,
  Animation,
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  EasingFunction,
  HemisphericLight,
  Matrix,
  Mesh,
  QuadraticEase,
  SceneLoader,
  TransformNode,
  Vector3,
  Viewport,
  type Engine,
  type Scene,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { DashboardModelLabel, LabelAction } from "@ecoctrl/shared";
import { updateClipPlane, setClipTarget, type ClipState } from "./clipping-utils";
import {
  INITIAL_ALPHA,
  INITIAL_BETA,
  INITIAL_TARGET,
  FALLBACK_URL,
  DEFAULT_LABELS,
  DEFAULT_V2_LABELS,
  type LabelDef,
} from "./constants";
import type { ModelFileEntry } from "@ecoctrl/shared";
import {
  createEngine,
  createScene,
  loadGltf,
  setupSandboxEnvironment,
  ENVIRONMENTS,
  type EnvKey,
} from "@ecoctrl/shared/babylon";
import type { ModelGroup, LabelAnchor, ModelLoadConfig, ViewerOptions } from "./types";

// ========================================
// ModelViewer — BabylonJS scene manager
// ========================================

export interface VisibilitySnapshot {
  meshes: Array<{ mesh: AbstractMesh; isVisible: boolean; isEnabled: boolean }>;
}

export interface ModelViewerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  enterImmersive: () => void;
  exitImmersive: () => void;
  focusOnLabel: (key: string) => void;
  setClipping: (enabled: boolean) => void;
  setSidebarWidth: (width: number) => void;
  executeTagActions: (labelKey: string) => Promise<void>;
  captureVisibilitySnapshot: () => VisibilitySnapshot;
  restoreVisibilitySnapshot: (snapshot: VisibilitySnapshot) => void;
}

export class ModelViewer implements ModelViewerRef {
  // Core BabylonJS objects
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;

  // Canvas reference
  private readonly canvas: HTMLCanvasElement;

  // Callbacks
  private onLoad?: () => void;
  private onCriticalLoaded?: () => void;
  private onProgress?: (progress: number) => void;
  private onLabelsChange?: () => void;

  // Runtime state
  private showLabels = true;
  private isInteracting = false;

  // Sidebar offset for label projection
  private sidebarWidth = 0;

  // Camera defaults
  private defaultCameraRadius: number;

  // Post-load camera target for resetCamera
  private postLoadTarget: Vector3 | null = null;

  // Radius that frames the loaded model; used as the baseline for
  // reset / fullscreen instead of the user-supplied default.
  private fittedCameraRadius: number | null = null;

  // Full camera snapshot after model load — used by resetCamera.
  private initialCameraState: {
    alpha: number;
    beta: number;
    radius: number;
    target: Vector3;
  } | null = null;

  // Label anchors (computed after model load)
  private labelAnchors: LabelAnchor[] = [];

  // Label definitions (fallback positions / mesh keywords for anchor computation)
  private labelDefs: LabelDef[] = DEFAULT_LABELS;

  // V2 labels with operations (from config or per-group labels)
  private v2Labels: DashboardModelLabel[] = DEFAULT_V2_LABELS;

  // Clip plane state
  private clipState: ClipState = {
    currentY: 999,
    targetY: 999,
    lobbyTop: 2,
  };

  // Loaded model groups
  private groups: ModelGroup[] = [];

  // Skybox mesh for cleanup
  private skybox: Mesh | null = null;

  // Resize handler reference for cleanup
  private handleResize: () => void;

  // Interaction listener references for cleanup
  private interactionListeners: {
    down: () => void;
    move: () => void;
    up: () => void;
    wheel: (e: Event) => void;
  } | null = null;

  constructor(options: ViewerOptions) {
    this.canvas = options.canvas;
    this.onLoad = options.onLoad;
    this.onCriticalLoaded = options.onCriticalLoaded;
    this.onProgress = options.onProgress;
    this.onLabelsChange = options.onLabelsChange;
    this.defaultCameraRadius = options.defaultCameraRadius;
    this.sidebarWidth = options.sidebarWidth ?? 0;

    this.engine = createEngine(this.canvas);
    this.scene = createScene(this.engine);

    // Disable BabylonJS built-in loading screen — we use a custom React overlay.
    SceneLoader.ShowLoadingScreen = false;

    // Optional hardware scaling. Values below 1 reduce fill-rate on high-DPI
    // displays but may cause grid-like artifacts on some PBR materials.
    if (options.hardwareScalingLevel !== undefined && options.hardwareScalingLevel > 0) {
      this.engine.setHardwareScalingLevel(options.hardwareScalingLevel);
    }

    // NOTE: hardware scaling disabled — it causes grid-like rendering artifacts
    // on PBR materials with this model set. Re-enable after root cause is found.
    // this.engine.setHardwareScalingLevel(0.5);

    // Cap texture size if the engine supports it (tree-shaking may drop ThinEngine method).
    if (typeof (this.engine as any).setMaximumTextureSize === "function") {
      (this.engine as any).setMaximumTextureSize(1024);
    }

    // Defensive: explicitly disable debug rendering modes.
    this.scene.forceWireframe = false;
    this.scene.forcePointsCloud = false;
    this.scene.forceShowBoundingBoxes = false;

    // Create camera
    this.camera = new ArcRotateCamera(
      "camera",
      INITIAL_ALPHA,
      INITIAL_BETA,
      this.defaultCameraRadius,
      INITIAL_TARGET.clone(),
      this.scene,
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.wheelPrecision = 50;
    this.camera.lowerRadiusLimit = 8;
    this.camera.upperRadiusLimit = 60;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.maxZ = 200;
    this.camera.viewport = new Viewport(0, 0, 1, 1);

    // Sandbox-style skybox + minimal IBL for PBR ambient fill.
    try {
      this.skybox = setupSandboxEnvironment(this.scene, { environmentIntensity: 0.05 });
    } catch (err) {
      console.warn("[ModelViewer] Failed to load environment texture:", err);
    }

    // Manual lighting for PBR materials (no IBL = need stronger lights).
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 1.2;
    hemi.diffuse = new Color3(1, 1, 1);
    hemi.groundColor = new Color3(0.7, 0.7, 0.7);

    const dir = new DirectionalLight("dir", new Vector3(-1, -2, 1), this.scene);
    dir.intensity = 1.0;
    dir.position = new Vector3(5, 10, -5);

    // Skip pointer-move picking unless hover interactions are needed. This saves
    // a full scene raycast on every pointermove event.
    this.scene.skipPointerMovePicking = true;

    // Interaction-aware render loop: full 60fps while user interacts,
    // throttled to 10fps when idle to save GPU/CPU for static scenes.
    let lastRenderTime = 0;
    const IDLE_INTERVAL = 100; // ms between frames when idle (10fps)

    const markInteracting = () => {
      this.isInteracting = true;
    };
    const markIdle = () => {
      this.isInteracting = false;
    };

    this.interactionListeners = {
      down: markInteracting,
      move: markInteracting,
      up: markIdle,
      wheel: markInteracting,
    };
    this.canvas.addEventListener("pointerdown", markInteracting);
    this.canvas.addEventListener("pointermove", markInteracting);
    this.canvas.addEventListener("pointerup", markIdle);
    this.canvas.addEventListener("wheel", markInteracting, { passive: true });

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      if (!this.isInteracting && now - lastRenderTime < IDLE_INTERVAL) {
        return;
      }
      lastRenderTime = now;
      this.render();
    });

    // Resize handling
    this.handleResize = () => this.engine.resize();
    window.addEventListener("resize", this.handleResize);
  }

  // ========================================
  // Render loop
  // ========================================

  private lastFrameTime = 0;
  private slowFrameCount = 0;
  private slowFrameLogCount = 0;
  private slowFrameLogDeadline = 0;
  private static readonly SLOW_FRAME_LOG_INTERVAL = 5000;
  private static readonly SLOW_FRAME_LOG_MAX = 5;

  private render(): void {
    const start = performance.now();

    this.scene.render();

    // Update clip plane
    updateClipPlane(this.scene, this.clipState);

    const elapsed = performance.now() - start;
    // Throttle slow-frame warnings: log at most once every 5s and max 5 times.
    // console.warn itself can cause jank on some browsers.
    if (elapsed > 16.67) {
      this.slowFrameCount++;
      const now = performance.now();
      if (
        this.slowFrameLogCount < ModelViewer.SLOW_FRAME_LOG_MAX &&
        now >= this.slowFrameLogDeadline
      ) {
        this.slowFrameLogCount++;
        this.slowFrameLogDeadline = now + ModelViewer.SLOW_FRAME_LOG_INTERVAL;
        console.warn(
          `[ModelViewer] Slow render loop detected: ${elapsed.toFixed(2)}ms/frame ` +
            `(${this.slowFrameCount} slow frames since start). ` +
            `Consider reducing scene complexity.`,
        );
      }
    }
  }

  // ========================================
  // Loading
  // ========================================

  /**
   * Load models from config. Supports single-model (backward compat)
   * and multi-model (groups array) modes.
   *
   * Multi-model loading strategy:
   * 1. Critical models load first (parallel), blocking.
   * 2. Fire onCriticalLoaded when critical models are done.
   * 3. Background models load in parallel, non-blocking.
   * 4. Camera is framed to the combined bounding box of all loaded groups.
   */
  async load(config: ModelLoadConfig): Promise<void> {
    const { groups, fallbackUrl = FALLBACK_URL, globalLabels } = config;

    // Store V2 labels (full set) and build fallback labelDefs for anchor computation.
    // Filtering by modelBindings happens in computeLabelAnchors after models load.
    if (globalLabels) {
      this.v2Labels = globalLabels;
    }

    if (groups && groups.length > 0) {
      await this.loadMultiModel(groups, fallbackUrl);
    } else {
      // Single-model backward compatible path
      await this.loadSingle(fallbackUrl, "default");
      this.onLoad?.();
    }
  }

  /**
   * Multi-model progressive loading.
   * Critical models block; background models load after critical are done.
   */
  private async loadMultiModel(entries: ModelFileEntry[], fallbackUrl: string): Promise<void> {
    const critical = entries.filter((e) => e.priority === "critical");
    const background = entries.filter((e) => e.priority !== "critical");

    // Step 1: Load critical models in parallel, blocking.
    const criticalResults = await Promise.all(
      critical.map((entry) => this.tryLoadGroup(entry).catch(() => null)),
    );

    const criticalLoaded = criticalResults.filter((r): r is NonNullable<typeof r> => r !== null);

    // Fallback: only when there ARE critical models and ALL of them failed.
    if (critical.length > 0 && criticalLoaded.length === 0) {
      console.warn(
        `[ModelViewer] All ${critical.length} critical model(s) failed, falling back to "${fallbackUrl}"`,
      );
      try {
        await this.loadSingle(fallbackUrl, "fallback");
      } catch {
        /* silently ignore */
      }
    }

    // If no critical models at all, load the first entry as fallback
    // so we still have a reference for camera framing.
    let firstModelLoaded = criticalLoaded.length > 0;
    if (!firstModelLoaded && entries.length > 0) {
      const firstEntry = entries[0];
      console.warn(
        `[ModelViewer] No critical models found; loading first entry "${firstEntry.id}" as fallback`,
      );
      const fallbackGroup = await this.tryLoadGroup(firstEntry).catch(() => null);
      if (fallbackGroup) {
        firstModelLoaded = true;
      }
    }

    // Finalize scene state once the first model is available.
    if (firstModelLoaded) {
      this.freezeStaticMeshes();
      this.setupPostLoadState();
      this.computeLabelAnchors();
      this.detectLobbyTopFromScene();
    }

    this.onProgress?.(100);
    this.onCriticalLoaded?.();
    this.onLoad?.();

    // Step 2: Load background models in the background (non-blocking).
    if (background.length > 0) {
      Promise.all(background.map((entry) => this.tryLoadGroup(entry).catch(() => null))).then(
        (results) => {
          const loaded = results.filter(Boolean);
          if (loaded.length > 0) {
            this.freezeStaticMeshes();
            this.computeLabelAnchors();
            this.onLabelsChange?.();
          }
        },
      );
    }
  }

  /**
   * Try to load a single model group. Returns the group on success, null on failure.
   */
  private async tryLoadGroup(entry: ModelFileEntry): Promise<ModelGroup | null> {
    try {
      const rootNode = await this.loadSingle(entry.fileKey, entry.id);
      const group: ModelGroup = {
        ...entry,
        rootNode,
        visible: true,
      };
      // Replace the placeholder group added by loadSingle with the full entry.
      const idx = this.groups.findIndex((g) => g.id === entry.id);
      if (idx >= 0) {
        this.groups[idx] = group;
      } else {
        this.groups.push(group);
      }
      return group;
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode ?? "unknown";
      const message = err?.message ?? String(err);
      console.warn(
        `[ModelViewer] Failed to load model group "${entry.id}" from "${entry.fileKey}" (priority: ${entry.priority}): HTTP ${status} - ${message}`,
        err,
      );
      return null;
    }
  }

  /**
   * Load a single model file. Creates a dedicated TransformNode parent
   * under the pivot for this group.
   */
  async loadSingle(url: string, groupId: string): Promise<TransformNode> {
    console.log(`[ModelViewer] Loading model group "${groupId}" from: ${url}`);

    const groupParent = new TransformNode(`groupParent_${groupId}`, this.scene);

    const result = await loadGltf({
      scene: this.scene,
      url,
      modelId: groupId,
      useBlob: false,
      forceExtension: ".glb",
      compileMaterials: false,
      onProgress: (event) => {
        if (event.lengthComputable && event.total > 0) {
          const value = Math.min(99, (event.loaded / event.total) * 100);
          this.onProgress?.(value);
        }
      },
    });
    URL.revokeObjectURL(result.sourceUrl);

    // Match admin: parent the returned modelRoot under groupParent.
    // loadGltf already parents __root__ and orphan meshes under modelRoot.
    result.modelRoot.parent = groupParent;
    // Placeholder group entry (will be replaced by tryLoadGroup with full data).
    this.groups.push({
      id: groupId,
      fileKey: url,
      rootNode: groupParent,
      visible: true,
      priority: "background",
      order: 0,
    });

    this.scene.stopAllAnimations();

    return groupParent;
  }

  /**
   * Freeze static meshes and materials after all transforms are applied.
   * This is safe because the building model does not animate at runtime.
   */
  private freezeStaticMeshes(): void {
    this.scene.updateTransformMatrix(true);

    for (const group of this.groups) {
      if (!group.rootNode) continue;
      for (const mesh of group.rootNode.getChildMeshes()) {
        if (!mesh.isEnabled()) continue;
        mesh.freezeWorldMatrix();
        mesh.cullingStrategy = AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
        mesh.material?.freeze();
      }
    }

    this.scene.freezeMaterials();
  }

  /**
   * Unfreeze materials on meshes that will be modified by actions.
   * Materials are frozen after load for performance; actions that modify
   * material properties (highlight, material, explode) must unfreeze first.
   */
  private unfreezeMaterialsForMeshes(meshes: AbstractMesh[]): void {
    for (const mesh of meshes) {
      if (mesh.material?.isFrozen) {
        mesh.material.unfreeze();
      }
    }
  }

  /**
   * Collect meshes from specified model groups.
   * If no model IDs are specified, returns all meshes.
   */
  private filterMeshes(modelIds?: string[]): AbstractMesh[] {
    const ids = (modelIds ?? []).map((k) => k.toLowerCase()).filter(Boolean);

    const result: AbstractMesh[] = [];
    for (const group of this.groups) {
      if (!group.rootNode) continue;
      if (ids.length > 0 && !ids.includes(group.id.toLowerCase())) continue;
      result.push(...group.rootNode.getChildMeshes());
    }
    return result;
  }

  /**
   * Set up camera target after critical models are loaded.
   */
  private setupPostLoadState(): void {
    // Compute combined bounding box of all loaded groups.
    let combinedMin: Vector3 | null = null;
    let combinedMax: Vector3 | null = null;

    for (const group of this.groups) {
      if (!group.rootNode) continue;
      // getChildMeshes() recurses through TransformNodes (__root__ etc.)
      const meshes = group.rootNode.getChildMeshes();
      if (meshes.length === 0) continue;

      for (const mesh of meshes) {
        if (!mesh.getBoundingInfo) continue;
        const bi = mesh.getBoundingInfo();
        if (!bi) continue;
        const min = bi.boundingBox.minimumWorld;
        const max = bi.boundingBox.maximumWorld;
        if (!combinedMin) {
          combinedMin = min.clone();
          combinedMax = max.clone();
        } else {
          combinedMin = Vector3.Minimize(combinedMin, min);
          combinedMax = Vector3.Maximize(combinedMax, max);
        }
      }
    }

    if (combinedMin && combinedMax) {
      const size = combinedMax.subtract(combinedMin);
      const center = combinedMin.add(size.scale(0.5));
      // Frame the camera on the model's actual center, preserving the original
      // world-space coordinates so label positions match the admin preview.
      const target = center;
      const radius = Math.max(size.x, size.y, size.z) * 2.0;
      this.camera.setTarget(target);
      this.postLoadTarget = target.clone();
      this.fittedCameraRadius = radius;
      this.camera.radius = radius;

      // Snapshot the complete camera state for resetCamera.
      this.initialCameraState = {
        alpha: this.camera.alpha,
        beta: this.camera.beta,
        radius: this.camera.radius,
        target: target.clone(),
      };
      this.camera.lowerRadiusLimit = radius * 0.1;
      this.camera.upperRadiusLimit = radius * 5;
      this.camera.maxZ = radius * 10;

      console.log(
        `[ModelViewer] setupPostLoadState: combinedMin=(${combinedMin.x.toFixed(2)}, ${combinedMin.y.toFixed(2)}, ${combinedMin.z.toFixed(2)}), ` +
          `combinedMax=(${combinedMax.x.toFixed(2)}, ${combinedMax.y.toFixed(2)}, ${combinedMax.z.toFixed(2)}), ` +
          `size=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}), target=(${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}), ` +
          `camera.radius=${this.camera.radius.toFixed(2)}, alpha=${this.camera.alpha.toFixed(2)}, beta=${this.camera.beta.toFixed(2)}`,
      );
    } else {
      console.warn(
        `[ModelViewer] setupPostLoadState: no bounding box computed (groups=${this.groups.length})`,
      );
    }
  }

  // ========================================
  // Label anchor computation
  // ========================================

  private computeLabelAnchors(): void {
    const allNodes = [...this.scene.meshes, ...this.scene.transformNodes];
    const findNode = (keywords: string[]) =>
      allNodes.find((n) => keywords.some((kw) => n.name.toLowerCase().includes(kw.toLowerCase())));

    // Build a map of which group each mesh belongs to.
    const meshToGroup = new Map<string, string>();
    for (const group of this.groups) {
      if (!group.rootNode) continue;
      const collectMeshes = (node: TransformNode) => {
        for (const child of node.getChildren()) {
          if ((child as any).getBoundingInfo) {
            meshToGroup.set(child.name, group.id);
          }
          if (child instanceof TransformNode) {
            collectMeshes(child);
          }
        }
      };
      collectMeshes(group.rootNode);
    }

    // Build set of loaded model file IDs for label filtering.
    const loadedModelIds = new Set(this.groups.map((g) => g.id));

    // Filter labels by modelBindings: empty = scene label (always visible),
    // otherwise show only when ALL bound models are loaded and visible.
    const filteredLabels = this.v2Labels.filter((l) => {
      if (!l.modelBindings || l.modelBindings.length === 0) return true;
      return l.modelBindings.every((id) => loadedModelIds.has(id));
    });

    // Rebuild labelDefs from filtered labels.
    this.labelDefs = this.toLabelDefs(filteredLabels);

    this.labelAnchors = this.labelDefs.map((cfg) => {
      const node = findNode(cfg.meshKeywords);
      let worldPos: Vector3;
      let source: "mesh" | "position" = "position";
      let groupId = "default";

      if (node && (node as any).getBoundingInfo) {
        worldPos = (node as any).getBoundingInfo().boundingBox.centerWorld.clone();
        source = "mesh";
        groupId = meshToGroup.get(node.name) ?? "default";
      } else if (node) {
        worldPos = node.getAbsolutePosition().clone();
        source = "mesh";
        groupId = meshToGroup.get(node.name) ?? "default";
      } else {
        worldPos = cfg.fallbackPosition.clone();
      }

      return { key: cfg.key, groupId, worldPos, source };
    });
  }

  /**
   * Detect lobby top height from all loaded scene nodes.
   */
  private detectLobbyTopFromScene(): void {
    const allNodes = [...this.scene.meshes, ...this.scene.transformNodes];
    const lobbyNode = allNodes.find((n) =>
      ["lobby", "大堂", "大厅", "entrance"].some((kw) =>
        n.name.toLowerCase().includes(kw.toLowerCase()),
      ),
    );

    if (lobbyNode && (lobbyNode as any).getBoundingInfo) {
      // Generous margin above lobby top so the lobby itself stays fully visible.
      this.clipState.lobbyTop =
        (lobbyNode as any).getBoundingInfo().boundingBox.maximumWorld.y + 1.5;
      return;
    }

    // Fallback: estimate lobby height as ~35% of total building height.
    let maxY = 0;
    for (const mesh of this.scene.meshes) {
      if (mesh.getBoundingInfo) {
        maxY = Math.max(maxY, mesh.getBoundingInfo().boundingBox.maximumWorld.y);
      }
    }
    this.clipState.lobbyTop = maxY * 0.35;
  }

  // ========================================
  // Camera controls (ModelViewerRef)
  // ========================================

  zoomIn(): void {
    this.camera.radius = Math.max(this.camera.radius * 0.8, this.camera.lowerRadiusLimit ?? 8);
  }

  zoomOut(): void {
    this.camera.radius = Math.min(this.camera.radius * 1.25, this.camera.upperRadiusLimit ?? 60);
  }

  resetCamera(): void {
    // Restore the exact camera state captured after model load.
    if (this.initialCameraState) {
      this.camera.alpha = this.initialCameraState.alpha;
      this.camera.beta = this.initialCameraState.beta;
      this.camera.radius = this.initialCameraState.radius;
      this.camera.setTarget(this.initialCameraState.target);
    } else {
      // Fallback if model hasn't loaded yet.
      this.camera.alpha = INITIAL_ALPHA;
      this.camera.beta = INITIAL_BETA;
      this.camera.radius = this.fittedCameraRadius ?? this.defaultCameraRadius;
      this.camera.setTarget(this.postLoadTarget ?? INITIAL_TARGET);
    }

    // Reset viewport
    this.camera.viewport = new Viewport(0, 0, 1, 1);

    // Reset clip plane
    this.clipState.targetY = 999;
    this.clipState.currentY = 999;
    this.scene.clipPlane = null;

    // Restore all model groups to visible (labels may have toggled them off).
    for (const group of this.groups) {
      this.setGroupVisible(group.id, true);
    }
  }

  enterImmersive(): void {
    const base = this.fittedCameraRadius ?? this.defaultCameraRadius;
    // 0.75 keeps the model inside the viewport; 0.5 was too close and clipped it.
    this.camera.radius = Math.max(base * 0.75, this.camera.lowerRadiusLimit ?? 8);
  }

  exitImmersive(): void {
    this.camera.radius = this.fittedCameraRadius ?? this.defaultCameraRadius;
  }

  focusOnLabel(key: string): void {
    const label = this.v2Labels.find((l) => l.meta.id === key);
    if (!label) return;

    for (const action of label.actions) {
      this.executeAction(action);
    }
  }

  /**
   * Execute all actions bound to a tag/label by key.
   * Used by the large-screen dashboard when a tag pill is clicked.
   */
  async executeTagActions(labelKey: string): Promise<void> {
    const label = this.v2Labels.find((l) => l.meta.id === labelKey);
    if (!label) {
      console.warn(`[ModelViewer] tag not found: ${labelKey}`);
      return;
    }

    for (const action of label.actions) {
      // TODO: support sequential animation with duration/easing.
      this.executeAction(action);
    }
  }

  /**
   * Execute a single label action.
   */
  private executeAction(action: LabelAction): void {
    switch (action.type) {
      case "camera": {
        const cfg = action.config as {
          position?: { x: number; y: number; z: number };
          lookAt?: { x: number; y: number; z: number };
          duration?: number;
          easing?: string;
        };
        // Backward compat: old format had target+distance
        if (!cfg.position || !cfg.lookAt) {
          const oldCfg = action.config as {
            target?: { x: number; y: number; z: number };
            distance?: number;
          };
          if (oldCfg.target && oldCfg.distance) {
            // Derive position from target + distance (approximate front view)
            const t = oldCfg.target;
            cfg.lookAt = { x: t.x, y: t.y, z: t.z };
            cfg.position = { x: t.x, y: t.y + oldCfg.distance * 0.5, z: t.z - oldCfg.distance };
          } else {
            console.warn("[ModelViewer] camera action missing position/lookAt:", action.id);
            break;
          }
        }
        const pos = new Vector3(cfg.position.x, cfg.position.y, cfg.position.z);
        const lookAt = new Vector3(cfg.lookAt.x, cfg.lookAt.y, cfg.lookAt.z);
        const duration = cfg.duration ?? 0;

        // Convert position + lookAt → ArcRotateCamera params
        const direction = lookAt.subtract(pos);
        const radius = direction.length();
        const targetAlpha = Math.atan2(direction.x, direction.z);
        const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const targetBeta = Math.atan2(horizontalDist, direction.y);
        // Clamp beta to avoid gimbal lock at poles
        const clampedBeta = Math.max(0.1, Math.min(Math.PI - 0.1, targetBeta));

        if (duration > 0) {
          const frameCount = Math.max(1, Math.round(duration * 60));

          const alphaAnim = new Animation(
            "cameraAlphaAnim",
            "alpha",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          alphaAnim.setKeys([
            { frame: 0, value: this.camera.alpha },
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
            { frame: 0, value: this.camera.beta },
            { frame: frameCount, value: clampedBeta },
          ]);

          const radiusAnim = new Animation(
            "cameraRadiusAnim",
            "radius",
            60,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
          );
          radiusAnim.setKeys([
            { frame: 0, value: this.camera.radius },
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
            { frame: 0, value: this.camera.target.clone() },
            { frame: frameCount, value: lookAt },
          ]);

          // Apply easing
          if (cfg.easing && cfg.easing !== "linear") {
            const easingFn = new QuadraticEase();
            switch (cfg.easing) {
              case "easeIn":
                easingFn.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
                break;
              case "easeOut":
                easingFn.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
                break;
              case "easeInOut":
              default:
                easingFn.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
                break;
            }
            alphaAnim.setEasingFunction(easingFn);
            betaAnim.setEasingFunction(easingFn);
            radiusAnim.setEasingFunction(easingFn);
            targetAnim.setEasingFunction(easingFn);
          }

          this.scene.beginDirectAnimation(
            this.camera,
            [alphaAnim, betaAnim, radiusAnim, targetAnim],
            0,
            frameCount,
            false,
            1,
          );

          // Force render loop to stay at 60fps during animation
          this.isInteracting = true;
          setTimeout(
            () => {
              this.isInteracting = false;
            },
            duration * 1000 + 100,
          );
        } else {
          // Instant snap
          this.camera.alpha = targetAlpha;
          this.camera.beta = clampedBeta;
          this.camera.radius = radius;
          this.camera.setTarget(lookAt);
        }
        break;
      }

      case "clipping": {
        const cfg = action.config as { planeOffset: number };
        // planeOffset is the Y-height for the clip plane.
        setClipTarget(this.clipState, cfg.planeOffset);
        break;
      }

      case "visibility": {
        const cfg = action.config as {
          targets?: string[];
          action: string;
        };
        const matchedMeshes = this.filterMeshes(cfg.targets);

        for (const mesh of matchedMeshes) {
          let next: boolean;
          switch (cfg.action) {
            case "hide":
              next = false;
              break;
            case "show":
              next = true;
              break;
            case "toggle":
            default:
              next = !(mesh.isEnabled() && mesh.isVisible);
              break;
          }
          mesh.setEnabled(next);
          mesh.isVisible = next;
        }
        break;
      }

      case "postprocess": {
        // Postprocess operations are not supported in the simplified viewer.
        break;
      }

      case "highlight": {
        const cfg = action.config as {
          targets?: string[];
          mode: string;
          color?: { r: number; g: number; b: number; a?: number };
          duration?: number;
        };
        const matched = this.filterMeshes(cfg.targets);

        // Unfreeze materials before modifying properties
        if (cfg.mode === "glow" || cfg.mode === "color") {
          this.unfreezeMaterialsForMeshes(matched);
        }

        for (const mesh of matched) {
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
                (mesh as any).__origEmissive = (mesh.material as any).emissiveColor?.clone();
                (mesh.material as any).emissiveColor = new Color3(
                  cfg.color?.r ?? 0.3,
                  cfg.color?.g ?? 0.3,
                  cfg.color?.b ?? 0.3,
                );
              }
              break;
            case "color":
              if (mesh.material) {
                (mesh as any).__origDiffuse = (mesh.material as any).diffuseColor?.clone();
                (mesh.material as any).diffuseColor = new Color3(
                  cfg.color?.r ?? 1,
                  cfg.color?.g ?? 0.8,
                  cfg.color?.b ?? 0,
                );
              }
              break;
          }
        }
        break;
      }

      case "explode": {
        const cfg = action.config as {
          axis: { x: number; y: number; z: number };
          distance: number;
          targets?: string[];
          duration?: number;
        };
        const axis = new Vector3(cfg.axis.x, cfg.axis.y, cfg.axis.z).normalize();
        const keywords = (cfg.targets ?? []).map((k: string) => k.toLowerCase()).filter(Boolean);

        for (const group of this.groups) {
          if (!group.rootNode) continue;
          const meshes = group.rootNode.getChildMeshes();
          for (const mesh of meshes) {
            if (keywords.length > 0) {
              const nameToCheck = mesh.name.toLowerCase();
              const isMatch = keywords.some(
                (k) => nameToCheck.includes(k) || group.id.toLowerCase().includes(k),
              );
              if (!isMatch) continue;
            }

            // Store original position for restore
            if (!(mesh as any).__origPosition) {
              (mesh as any).__origPosition = mesh.position.clone();
            }

            const offset = axis.scale(cfg.distance);
            mesh.position = (mesh as any).__origPosition.add(offset);
          }
        }
        break;
      }

      case "material": {
        const cfg = action.config as {
          targets?: string[];
          property: string;
          value: number | boolean;
          duration?: number;
        };
        const matched = this.filterMeshes(cfg.targets);

        // Unfreeze materials before modifying properties
        this.unfreezeMaterialsForMeshes(matched);

        for (const mesh of matched) {
          const mat = mesh.material as any;
          if (!mat) continue;

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
        }
        break;
      }

      case "label": {
        const cfg = action.config as {
          labelIds: string[];
          action: string;
        };
        // Dispatch a custom event that the React overlay can listen to
        const event = new CustomEvent("label-control", {
          detail: { labelIds: cfg.labelIds, action: cfg.action },
        });
        this.canvas.dispatchEvent(event);
        break;
      }
    }
  }

  setClipping(enabled: boolean): void {
    // Animate clip plane toward lobbyTop (enabled) or above roof (disabled).
    setClipTarget(this.clipState, enabled ? this.clipState.lobbyTop : 999);
  }

  setSidebarWidth(width: number): void {
    this.sidebarWidth = width;
    // Resize once after CSS transition ends (300ms + buffer)
    setTimeout(() => this.engine.resize(), 350);
  }

  // ========================================
  // State setters
  // ========================================

  setShowLabels(show: boolean): void {
    this.showLabels = show;
  }

  setDefaultCameraRadius(radius: number): void {
    this.defaultCameraRadius = radius;
    // Only apply immediately before the model has been fitted; afterwards
    // reset/immersive actions should use the fitted baseline.
    if (this.fittedCameraRadius === null) {
      this.camera.radius = radius;
    }
  }

  setEnvironmentPreset(presetKey: string): void {
    const url = ENVIRONMENTS[presetKey as EnvKey];
    if (!url) {
      console.warn(`[ModelViewer] unknown environment preset: ${presetKey}`);
      return;
    }

    // Dispose old skybox.
    this.skybox?.dispose();
    this.skybox = null;

    // Clean up old environment texture before creating a new one.
    if (this.scene.environmentTexture) {
      this.scene.environmentTexture.dispose();
      this.scene.environmentTexture = null;
    }

    // Apply new environment.
    this.skybox = setupSandboxEnvironment(this.scene, { envUrl: url });
    console.log(`[ModelViewer] switched environment to: ${presetKey}`);
  }

  // ========================================
  // Label projection (for React overlay)
  // ========================================

  /**
   * Project all label anchors to 2D screen positions.
   * Returns map of label key → { x, y, visible }.
   */
  projectLabels(): Record<string, { x: number; y: number; visible: boolean }> {
    const result: Record<string, { x: number; y: number; visible: boolean }> = {};

    if (!this.labelAnchors.length) return result;

    // Build a set of visible group IDs for fast lookup.
    const visibleGroupIds = new Set(this.groups.filter((g) => g.visible).map((g) => g.id));

    const renderWidth = this.engine.getRenderWidth();
    const renderHeight = this.engine.getRenderHeight();
    const transformMatrix = this.scene.getTransformMatrix();
    const globalViewport = this.camera.viewport.toGlobal(renderWidth, renderHeight);

    for (const { key, worldPos, groupId } of this.labelAnchors) {
      // Labels not matched to a specific mesh group use the "default" group id
      // and should remain visible regardless of which model groups are toggled.
      const groupVisible = groupId === "default" || visibleGroupIds.has(groupId);

      const p = Vector3.Project(worldPos, Matrix.Identity(), transformMatrix, globalViewport);
      const onScreen =
        p.z > 0 && p.z < 1 && p.x >= 0 && p.x <= renderWidth && p.y >= 0 && p.y <= renderHeight;

      const visible = this.showLabels && groupVisible && onScreen;

      result[key] = { x: p.x, y: p.y, visible };
    }

    return result;
  }

  /**
   * Get the current label definitions (fallback positions for anchor computation).
   */
  getLabelDefs(): LabelDef[] {
    return this.labelDefs;
  }

  /**
   * Get the V2 labels with operations.
   */
  getV2Labels(): DashboardModelLabel[] {
    return this.v2Labels;
  }

  /**
   * Get the current label anchors.
   */
  getLabelAnchors(): LabelAnchor[] {
    return this.labelAnchors;
  }

  // ========================================
  // Group visibility
  // ========================================

  setGroupVisible(groupId: string, visible: boolean): void {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group || !group.rootNode) return;

    group.rootNode.setEnabled(visible);
    group.visible = visible;
  }

  getGroups(): ModelGroup[] {
    return this.groups;
  }

  // ========================================
  // Visibility snapshot
  // ========================================

  captureVisibilitySnapshot(): VisibilitySnapshot {
    const meshes: VisibilitySnapshot["meshes"] = [];
    for (const group of this.groups) {
      if (!group.rootNode) continue;
      for (const mesh of group.rootNode.getChildMeshes()) {
        meshes.push({
          mesh,
          isVisible: mesh.isVisible,
          isEnabled: mesh.isEnabled(),
        });
      }
    }
    return { meshes };
  }

  restoreVisibilitySnapshot(snapshot: VisibilitySnapshot): void {
    for (const { mesh, isVisible, isEnabled } of snapshot.meshes) {
      mesh.setEnabled(isEnabled);
      mesh.isVisible = isVisible;
    }
  }

  // ========================================
  // Helpers
  // ========================================

  /**
   * Convert V2 labels to LabelDefs for anchor computation.
   * Only fallbackPosition and meshKeywords are needed for anchor lookup.
   */
  private toLabelDefs(labels: DashboardModelLabel[]): LabelDef[] {
    return labels
      .filter((l) => l.anchor?.position !== undefined)
      .map((l) => ({
        key: l.meta.id,
        name: l.meta.name,
        fallbackPosition: new Vector3(
          l.anchor.position!.x,
          l.anchor.position!.y,
          l.anchor.position!.z,
        ),
        meshKeywords: l.anchor.meshKeywords,
      }));
  }

  // ========================================
  // Cleanup
  // ========================================

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);

    if (this.interactionListeners) {
      this.canvas.removeEventListener("pointerdown", this.interactionListeners.down);
      this.canvas.removeEventListener("pointermove", this.interactionListeners.move);
      this.canvas.removeEventListener("pointerup", this.interactionListeners.up);
      this.canvas.removeEventListener("wheel", this.interactionListeners.wheel);
    }

    this.engine.stopRenderLoop();
    this.camera.detachControl();
    this.skybox?.dispose();
    this.engine.dispose();
  }
}
