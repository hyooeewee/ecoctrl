import {
  ArcRotateCamera,
  Color4,
  Engine,
  GlowLayer,
  HemisphericLight,
  Matrix,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
  Viewport,
  type Nullable,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { DashboardModelLabel, LabelOperation } from "@ecoctrl/shared";
import { animateCameraRadius, animateCameraTo } from "./camera-utils";
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
import type { ModelGroup, LabelAnchor, ModelLoadConfig, ViewerOptions } from "./types";

// ========================================
// ModelViewer — BabylonJS scene manager
// ========================================

export interface ModelViewerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  ensureCloseUp: (minRadius: number) => void;
  resetToDefaultRadius: () => void;
  focusOnLabel: (key: string) => void;
  setViewportOffset: (px: number, canvasWidth: number) => void;
  setClipping: (enabled: boolean) => void;
}

export class ModelViewer implements ModelViewerRef {
  // Core BabylonJS objects
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  readonly glow: GlowLayer;
  readonly pivot: TransformNode;

  // Canvas reference
  private readonly canvas: HTMLCanvasElement;

  // Callbacks
  private onLoad?: () => void;
  private onCriticalLoaded?: () => void;
  private onProgress?: (progress: number) => void;

  // Runtime state
  private isInteracting = false;
  private autoRotate = false;
  private rotateSpeed = 1;
  private showLabels = true;

  // Camera defaults
  private defaultCameraRadius: number;
  private defaultRotationY: number;

  // Post-load camera state for resetCamera
  private postLoadCameraState: {
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

  // Resize handler reference for cleanup
  private handleResize: () => void;

  // Unified scale factor computed from first critical model.
  private unifiedScale: number | null = null;

  constructor(options: ViewerOptions) {
    this.canvas = options.canvas;
    this.onLoad = options.onLoad;
    this.onCriticalLoaded = options.onCriticalLoaded;
    this.onProgress = options.onProgress;
    this.defaultCameraRadius = options.defaultCameraRadius;
    this.defaultRotationY = options.defaultRotationY;

    // Create engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(6 / 255, 13 / 255, 24 / 255, 1);

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
    this.camera.viewport = new Viewport(0, 0, 1, 1);

    // Track user interaction
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerUp);

    // Lighting
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.6;

    // Glow layer
    this.glow = new GlowLayer("glow", this.scene);
    this.glow.intensity = options.glowIntensity;

    // Root pivot for rotation
    this.pivot = new TransformNode("rotationPivot", this.scene);
    this.pivot.rotation.y = (this.defaultRotationY * Math.PI) / 180;

    // Start render loop
    this.engine.runRenderLoop(() => this.render());

    // Resize handling
    this.handleResize = () => this.engine.resize();
    window.addEventListener("resize", this.handleResize);
  }

  // ========================================
  // Render loop
  // ========================================

  private lastFrameTime = 0;
  private slowFrameCount = 0;

  private render(): void {
    const start = performance.now();

    // Auto-rotate
    if (this.autoRotate && !this.isInteracting) {
      this.camera.alpha += 0.002 * this.rotateSpeed;
    }

    this.scene.render();

    // Update clip plane
    updateClipPlane(this.scene, this.clipState);

    const elapsed = performance.now() - start;
    // Log every 60 slow frames (about 1s at 60fps) to avoid console spam.
    if (elapsed > 16.67) {
      this.slowFrameCount++;
      if (this.slowFrameCount % 60 === 0) {
        console.warn(
          `[ModelViewer] Slow render loop detected: ${elapsed.toFixed(2)}ms/frame ` +
            `(${this.slowFrameCount} slow frames since start). ` +
            `Consider reducing scene complexity or disabling auto-rotate/glow.`,
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
   * 4. Unified scale is computed from the first critical model and applied to all.
   */
  async load(config: ModelLoadConfig): Promise<void> {
    const { groups, fallbackUrl = FALLBACK_URL, globalLabels } = config;

    // Store V2 labels and build fallback labelDefs for anchor computation.
    if (globalLabels) {
      this.v2Labels = globalLabels;
      this.labelDefs = this.toLabelDefs(globalLabels);
    }

    if (groups && groups.length > 0) {
      await this.loadMultiModel(groups, fallbackUrl);
    } else {
      // Single-model backward compatible path
      await this.loadSingle(fallbackUrl, "default");
    }
  }

  /**
   * Multi-model progressive loading.
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

    // If no critical models loaded, block-load the first background model
    // so we have a reference for unified scale and camera positioning.
    let firstModelLoaded = criticalLoaded.length > 0;
    if (!firstModelLoaded && background.length > 0) {
      const firstBg = await this.tryLoadGroup(background[0]).catch(() => null);
      if (firstBg) {
        firstModelLoaded = true;
        background.splice(0, 1);
      }
    }

    // Compute and apply unified scale once the first model is available.
    if (firstModelLoaded) {
      this.computeUnifiedScale();
      for (const group of this.groups) {
        if (group.rootNode) {
          this.applyUnifiedScale(group.rootNode);
        }
      }
      this.setupPostLoadState();
      this.computeLabelAnchors();
      this.detectLobbyTopFromScene();
    }

    this.onProgress?.(100);
    this.onCriticalLoaded?.();

    // Load remaining background models in parallel, non-blocking.
    if (background.length > 0) {
      Promise.all(background.map((entry) => this.tryLoadGroup(entry).catch(() => null))).then(
        (results) => {
          const loaded = results.filter((r): r is NonNullable<typeof r> => r !== null);
          for (const group of loaded) {
            if (group.rootNode) {
              this.applyUnifiedScale(group.rootNode);
            }
          }
          this.computeLabelAnchors();
          this.detectLobbyTopFromScene();
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
    const pluginExtension = url.includes(".glb")
      ? ".glb"
      : url.includes(".gltf")
        ? ".gltf"
        : undefined;

    console.log(`[ModelViewer] Loading model group "${groupId}" from: ${url}`);

    const result = await SceneLoader.ImportMeshAsync(
      null,
      "",
      url,
      this.scene,
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          const value = Math.min(99, (event.loaded / event.total) * 100);
          this.onProgress?.(value);
        }
      },
      pluginExtension,
    );

    const firstMesh = result.meshes[0];
    if (!firstMesh) {
      throw new Error(`No meshes loaded from ${url}`);
    }

    // Create a dedicated parent TransformNode for this group under the pivot.
    const groupParent = new TransformNode(`groupParent_${groupId}`, this.scene);
    groupParent.parent = this.pivot;

    // Use the __root__ from this import batch, not from the global scene
    // (the scene may already contain __root__ nodes from previous loads).
    const glbRoot = result.transformNodes.find((n) => n.name === "__root__") ?? firstMesh;
    glbRoot.parent = groupParent;

    // Compute bounding info in local space (relative to groupParent).
    // Use glbRoot (__root__) instead of firstMesh because firstMesh may have
    // a position offset inside glbRoot, making its coordinate system different
    // from groupParent. glbRoot is directly parented to groupParent with zero
    // offset, so its local space matches groupParent's.
    const { min, max } = glbRoot.getHierarchyBoundingVectors(false);
    const size = max.subtract(min);
    const center = min.add(size.scale(0.5));
    const maxSize = Math.max(size.x, size.y, size.z);
    const localScale = maxSize > 0 ? 10 / maxSize : 1;

    // Store the local scale on the groupParent for later unified scaling.
    (groupParent as any).__localScale = localScale;
    (groupParent as any).__boundsMin = min.clone();
    (groupParent as any).__boundsCenter = center.clone();

    // Placeholder group entry (will be replaced by tryLoadGroup with full data).
    this.groups.push({
      id: groupId,
      fileKey: url,
      rootNode: groupParent,
      visible: true,
    });

    this.scene.stopAllAnimations();

    return groupParent;
  }

  /**
   * Compute unified scale from the first critical model's bounding box.
   */
  private computeUnifiedScale(): void {
    for (const group of this.groups) {
      if (group.rootNode && (group.rootNode as any).__localScale) {
        this.unifiedScale = (group.rootNode as any).__localScale;
        break;
      }
    }
    // If no scale computed, use default.
    if (this.unifiedScale === null) {
      this.unifiedScale = 1;
    }
  }

  /**
   * Apply unified scale to a group's root node.
   */
  private applyUnifiedScale(groupParent: TransformNode): void {
    const min = (groupParent as any).__boundsMin as Vector3 | undefined;
    const center = (groupParent as any).__boundsCenter as Vector3 | undefined;

    if (!this.unifiedScale || !min || !center) return;

    // Set scaling directly so every model shares the same world-space scale.
    // unifiedScale comes from the first loaded model's localScale (10/maxSize).
    groupParent.scaling = new Vector3(this.unifiedScale, this.unifiedScale, this.unifiedScale);

    // Reposition so the model base sits at y=0 and is centered on xz.
    // Position must be multiplied by the same scale because BabylonJS applies
    // scaling before translation: worldPos = parentPos + scale * localPos.
    groupParent.position.x = -center.x * this.unifiedScale;
    groupParent.position.y = -min.y * this.unifiedScale;
    groupParent.position.z = -center.z * this.unifiedScale;
  }

  /**
   * Set up camera target and post-load state after critical models are loaded.
   */
  private setupPostLoadState(): void {
    // Compute combined bounding box of all loaded groups.
    let combinedMin: Vector3 | null = null;
    let combinedMax: Vector3 | null = null;

    for (const group of this.groups) {
      if (!group.rootNode) continue;
      const meshes = group.rootNode.getChildMeshes(true);
      if (meshes.length === 0) continue;

      for (const mesh of meshes) {
        if (!mesh.getBoundingInfo) continue;
        const min = mesh.getBoundingInfo().boundingBox.minimumWorld;
        const max = mesh.getBoundingInfo().boundingBox.maximumWorld;
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
      // Aim the camera at the actual world-space center of the loaded models,
      // not the hard-coded origin, so the scene is centered regardless of
      // pivot rotation.
      const target = center.clone();
      this.camera.setTarget(target);

      // Snapshot post-load camera state
      this.postLoadCameraState = {
        alpha: this.camera.alpha,
        beta: this.camera.beta,
        radius: this.camera.radius,
        target: target.clone(),
      };
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
    const next = Math.max(this.camera.radius * 0.8, this.camera.lowerRadiusLimit ?? 8);
    animateCameraRadius(this.camera, next);
  }

  zoomOut(): void {
    const next = Math.min(this.camera.radius * 1.25, this.camera.upperRadiusLimit ?? 60);
    animateCameraRadius(this.camera, next);
  }

  resetCamera(): void {
    this.scene.stopAnimation(this.camera);
    this.camera.animations = [];

    const saved = this.postLoadCameraState;
    if (saved) {
      this.camera.alpha = saved.alpha;
      this.camera.beta = saved.beta;
      this.camera.radius = saved.radius;
      this.camera.target = saved.target.clone();
    } else {
      this.camera.alpha = INITIAL_ALPHA;
      this.camera.beta = INITIAL_BETA;
      this.camera.radius = this.defaultCameraRadius;
      this.camera.target = INITIAL_TARGET.clone();
    }

    // Reset viewport (remove sidebar offset)
    this.camera.viewport = new Viewport(0, 0, 1, 1);

    // Reset clip plane
    this.clipState.targetY = 999;
    this.clipState.currentY = 999;
    this.scene.clipPlane = null;

    // Reset pivot rotation
    this.pivot.rotation.setAll(0);
    this.pivot.rotationQuaternion = null;
    this.pivot.rotation.y = (this.defaultRotationY * Math.PI) / 180;
  }

  ensureCloseUp(minRadius: number): void {
    if (this.camera.radius >= minRadius) {
      animateCameraRadius(this.camera, minRadius * 0.9);
    }
  }

  resetToDefaultRadius(): void {
    animateCameraRadius(this.camera, this.defaultCameraRadius);
  }

  focusOnLabel(key: string): void {
    const label = this.v2Labels.find((l) => l.key === key);
    if (!label) return;

    for (const op of label.operations) {
      this.executeOperation(op);
    }
  }

  /**
   * Execute a single label operation.
   */
  private executeOperation(op: LabelOperation): void {
    switch (op.type) {
      case "camera": {
        const cfg = op.config;
        const target = new Vector3(cfg.target.x, cfg.target.y, cfg.target.z);
        // Compute alpha/beta from target direction, use distance as radius.
        const direction = target.subtract(this.camera.target);
        const targetAlpha = Math.atan2(direction.x, direction.z);
        const horizontalDist = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
        const targetBeta = Math.atan2(direction.y, horizontalDist) + Math.PI / 2;
        animateCameraTo(
          this.camera,
          targetAlpha,
          Math.max(0.1, Math.min(Math.PI / 2.2, targetBeta)),
          cfg.distance,
          cfg.duration,
        );
        break;
      }

      case "clipping": {
        const cfg = op.config;
        // planeOffset is the Y-height for the clip plane.
        setClipTarget(this.clipState, cfg.planeOffset);
        break;
      }

      case "visibility": {
        const cfg = op.config;
        for (const targetId of cfg.targets) {
          switch (cfg.action) {
            case "show":
              this.setGroupVisible(targetId, true);
              break;
            case "hide":
              this.setGroupVisible(targetId, false);
              break;
            case "toggle": {
              const group = this.groups.find((g) => g.id === targetId);
              if (group) {
                this.setGroupVisible(targetId, !group.visible);
              }
              break;
            }
          }
        }
        break;
      }

      case "postprocess": {
        const cfg = op.config;
        if (cfg.effect === "glow") {
          this.glow.intensity = cfg.value;
        }
        break;
      }
    }
  }

  setViewportOffset(px: number, canvasWidth: number): void {
    if (px > 0 && canvasWidth > 0) {
      const x = px / canvasWidth;
      this.camera.viewport = new Viewport(x, 0, 1 - x, 1);
    } else {
      this.camera.viewport = new Viewport(0, 0, 1, 1);
    }
  }

  setClipping(enabled: boolean): void {
    // Animate clip plane toward lobbyTop (enabled) or above roof (disabled).
    setClipTarget(this.clipState, enabled ? this.clipState.lobbyTop : 999);
  }

  // ========================================
  // State setters
  // ========================================

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  setRotateSpeed(speed: number): void {
    this.rotateSpeed = speed;
  }

  setShowLabels(show: boolean): void {
    this.showLabels = show;
  }

  setGlowIntensity(intensity: number): void {
    this.glow.intensity = intensity;
  }

  setDefaultCameraRadius(radius: number): void {
    this.defaultCameraRadius = radius;
    animateCameraRadius(this.camera, radius);
  }

  setDefaultRotationY(degrees: number): void {
    this.defaultRotationY = degrees;
    this.pivot.rotation.y = (degrees * Math.PI) / 180;
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
      // Skip if the anchor's group is not visible.
      const groupVisible = visibleGroupIds.has(groupId);

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
  // Helpers
  // ========================================

  /**
   * Convert V2 labels to LabelDefs for anchor computation.
   * Only fallbackPosition and meshKeywords are needed for anchor lookup.
   */
  private toLabelDefs(labels: DashboardModelLabel[]): LabelDef[] {
    return labels.map((l) => ({
      key: l.key,
      fallbackPosition: new Vector3(l.position.x, l.position.y, l.position.z),
      meshKeywords: l.meshKeywords,
    }));
  }

  // ========================================
  // Event handlers
  // ========================================

  private onPointerDown = (): void => {
    this.isInteracting = true;
  };

  private onPointerUp = (): void => {
    this.isInteracting = false;
  };

  // ========================================
  // Cleanup
  // ========================================

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);

    this.engine.stopRenderLoop();
    this.camera.detachControl();
    this.engine.dispose();
  }
}
