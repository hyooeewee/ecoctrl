// ========================================
// ViewCube — CAD-style 3D orientation widget
// ========================================
// A 120x120px cube overlay in the top-right corner of the viewport.
// Syncs rotation with the main camera. Clickable faces, edges, and corners
// trigger preset camera view changes with smooth easing animation.
// All interaction is handled via DOM events + math (no BabylonJS picking).

import {
  Animation,
  ArcRotateCamera,
  Color3,
  Color4,
  CubicEase,
  DynamicTexture,
  EasingFunction,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
  type Engine,
} from "@babylonjs/core";

// ========================================
// Types
// ========================================

export interface ViewCubeCallbacks {
  /** Called when a face/edge/corner is clicked. Consumer animates its own camera. */
  onViewChange: (params: { alpha: number; beta: number }) => void;
  /** Called when animation starts/ends so consumer can boost render fps. */
  onAnimating?: (animating: boolean) => void;
}

interface FaceDef {
  name: string;
  normal: Vector3;
  baseColor: Color3;
}

// ========================================
// Face / Edge / Corner definitions
// ========================================

const FACES: FaceDef[] = [
  { name: "前", normal: new Vector3(0, 0, -1), baseColor: new Color3(0.3, 0.55, 0.9) },
  { name: "后", normal: new Vector3(0, 0, 1), baseColor: new Color3(0.55, 0.55, 0.6) },
  { name: "右", normal: new Vector3(1, 0, 0), baseColor: new Color3(0.3, 0.72, 0.5) },
  { name: "左", normal: new Vector3(-1, 0, 0), baseColor: new Color3(0.55, 0.55, 0.6) },
  { name: "上", normal: new Vector3(0, 1, 0), baseColor: new Color3(0.9, 0.62, 0.2) },
  { name: "下", normal: new Vector3(0, -1, 0), baseColor: new Color3(0.55, 0.55, 0.6) },
];

const EDGES = [
  { name: "前右", dir: new Vector3(1, 0, -1).normalize(), adjFaces: ["前", "右"] },
  { name: "前左", dir: new Vector3(-1, 0, -1).normalize(), adjFaces: ["前", "左"] },
  { name: "后右", dir: new Vector3(1, 0, 1).normalize(), adjFaces: ["后", "右"] },
  { name: "后左", dir: new Vector3(-1, 0, 1).normalize(), adjFaces: ["后", "左"] },
  { name: "前上", dir: new Vector3(0, 1, -1).normalize(), adjFaces: ["前", "上"] },
  { name: "后上", dir: new Vector3(0, 1, 1).normalize(), adjFaces: ["后", "上"] },
  { name: "前下", dir: new Vector3(0, -1, -1).normalize(), adjFaces: ["前", "下"] },
  { name: "后下", dir: new Vector3(0, -1, 1).normalize(), adjFaces: ["后", "下"] },
  { name: "右上", dir: new Vector3(1, 1, 0).normalize(), adjFaces: ["右", "上"] },
  { name: "右下", dir: new Vector3(1, -1, 0).normalize(), adjFaces: ["右", "下"] },
  { name: "左上", dir: new Vector3(-1, 1, 0).normalize(), adjFaces: ["左", "上"] },
  { name: "左下", dir: new Vector3(-1, -1, 0).normalize(), adjFaces: ["左", "下"] },
];

const CORNERS = [
  { name: "前右上", dir: new Vector3(1, 1, -1).normalize(), adjFaces: ["前", "右", "上"] },
  { name: "前左上", dir: new Vector3(-1, 1, -1).normalize(), adjFaces: ["前", "左", "上"] },
  { name: "前右下", dir: new Vector3(1, -1, -1).normalize(), adjFaces: ["前", "右", "下"] },
  { name: "前左下", dir: new Vector3(-1, -1, -1).normalize(), adjFaces: ["前", "左", "下"] },
  { name: "后右上", dir: new Vector3(1, 1, 1).normalize(), adjFaces: ["后", "右", "上"] },
  { name: "后左上", dir: new Vector3(-1, 1, 1).normalize(), adjFaces: ["后", "左", "上"] },
  { name: "后右下", dir: new Vector3(1, -1, 1).normalize(), adjFaces: ["后", "右", "下"] },
  { name: "后左下", dir: new Vector3(-1, -1, 1).normalize(), adjFaces: ["后", "左", "下"] },
];

// ========================================
// Constants
// ========================================

const GIZMO_SIZE = 120;
const CUBE_SIZE = 1.6;
const CAMERA_DISTANCE = 4.5;
const ANIM_DURATION_MS = 400;

// Colors
const HOVER_FACE_COLOR = new Color3(79 / 255, 195 / 255, 247 / 255);
const HOVER_EDGE_COLOR = new Color3(1, 0.85, 0.2);
const HOVER_CORNER_GLOW = new Color3(1, 0.95, 0.7);

// ========================================
// ViewCube factory
// ========================================

export function createViewCube(
  mainEngine: Engine,
  mainCamera: ArcRotateCamera,
  container: HTMLElement,
  callbacks: ViewCubeCallbacks,
): { dispose: () => void } {
  // ------------------------------------
  // Overlay canvas
  // ------------------------------------
  const gizmoCanvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  gizmoCanvas.width = GIZMO_SIZE * dpr;
  gizmoCanvas.height = GIZMO_SIZE * dpr;
  gizmoCanvas.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    width: ${GIZMO_SIZE}px;
    height: ${GIZMO_SIZE}px;
    pointer-events: auto;
    cursor: pointer;
  `;
  container.appendChild(gizmoCanvas);

  // ------------------------------------
  // Engine & scene
  // ------------------------------------
  let gizmoEngine: Engine;
  try {
    gizmoEngine = new (mainEngine.constructor as any)(gizmoCanvas, {
      preserveDrawingBuffer: true,
      stencil: true,
    }) as Engine;
  } catch {
    console.warn("[ViewCube] Failed to create WebGL context, hiding ViewCube");
    gizmoCanvas.remove();
    return { dispose() {} };
  }
  gizmoEngine.setHardwareScalingLevel(1 / dpr);

  const gizmoScene = new Scene(gizmoEngine);
  gizmoScene.clearColor = new Color4(0, 0, 0, 0);

  // Camera — orthographic, always looking at origin
  const gizmoCamera = new ArcRotateCamera(
    "viewCubeCam",
    mainCamera.alpha,
    mainCamera.beta,
    CAMERA_DISTANCE,
    Vector3.Zero(),
    gizmoScene,
  );
  gizmoCamera.mode = 1;
  const orthoSize = 1.8;
  gizmoCamera.orthoLeft = -orthoSize;
  gizmoCamera.orthoRight = orthoSize;
  gizmoCamera.orthoTop = orthoSize;
  gizmoCamera.orthoBottom = -orthoSize;
  gizmoCamera.minZ = 0.1;
  gizmoCamera.maxZ = 20;

  // Lighting
  const light = new HemisphericLight("light", new Vector3(0, 1, -0.5), gizmoScene);
  light.intensity = 1.2;
  light.groundColor = new Color3(0.3, 0.3, 0.3);

  // ------------------------------------
  // Solid cube body
  // ------------------------------------
  const half = CUBE_SIZE / 2;
  const faceMaterials: StandardMaterial[] = [];

  const cubeBody = MeshBuilder.CreateBox("cubeBody", { size: CUBE_SIZE }, gizmoScene);
  const cubeMat = new StandardMaterial("cubeMat", gizmoScene);
  cubeMat.diffuseColor = new Color3(0.45, 0.48, 0.52);
  cubeMat.emissiveColor = new Color3(0.25, 0.27, 0.3);
  cubeMat.specularColor = new Color3(0, 0, 0);
  cubeMat.alpha = 1.0;
  cubeBody.material = cubeMat;
  cubeBody.isPickable = false;

  // ------------------------------------
  // Face label overlays
  // ------------------------------------
  const facePlanes: Mesh[] = [];

  const FACE_POSITIONS = [
    { name: "右", pos: new Vector3(half, 0, 0), rot: new Vector3(0, Math.PI / 2, 0) },
    { name: "左", pos: new Vector3(-half, 0, 0), rot: new Vector3(0, -Math.PI / 2, 0) },
    { name: "上", pos: new Vector3(0, half, 0), rot: new Vector3(-Math.PI / 2, 0, 0) },
    { name: "下", pos: new Vector3(0, -half, 0), rot: new Vector3(Math.PI / 2, 0, 0) },
    { name: "前", pos: new Vector3(0, 0, -half), rot: new Vector3(0, 0, 0) },
    { name: "后", pos: new Vector3(0, 0, half), rot: new Vector3(0, Math.PI, 0) },
  ];

  FACE_POSITIONS.forEach((def) => {
    const face = FACES.find((f) => f.name === def.name)!;
    const plane = MeshBuilder.CreatePlane(`face_${def.name}`, { size: CUBE_SIZE }, gizmoScene);
    const offset =
      def.name === "上"
        ? new Vector3(0, 0.01, 0)
        : def.name === "下"
          ? new Vector3(0, -0.01, 0)
          : def.name === "右"
            ? new Vector3(0.01, 0, 0)
            : def.name === "左"
              ? new Vector3(-0.01, 0, 0)
              : def.name === "前"
                ? new Vector3(0, 0, -0.01)
                : new Vector3(0, 0, 0.01);
    plane.position = def.pos.add(offset);
    plane.rotation = def.rot;
    plane.isPickable = false; // we use math-based hit testing

    const texSize = 128;
    const tex = new DynamicTexture(`tex_${def.name}`, texSize, gizmoScene, true);
    const ctx = tex.getContext();
    const r = Math.round(face.baseColor.r * 255);
    const g = Math.round(face.baseColor.g * 255);
    const b = Math.round(face.baseColor.b * 255);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, texSize, texSize);
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "white";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.name, texSize / 2, texSize / 2);
    tex.update();

    const mat = new StandardMaterial(`mat_${def.name}`, gizmoScene);
    mat.diffuseTexture = tex;
    mat.diffuseColor = new Color3(1, 1, 1);
    mat.emissiveColor = face.baseColor.scale(0.15);
    mat.specularColor = new Color3(0, 0, 0);
    mat.alpha = 1.0;
    mat.backFaceCulling = true;
    plane.material = mat;

    facePlanes.push(plane);
    faceMaterials.push(mat);
  });

  // ------------------------------------
  // Edge meshes (visual only, not for picking)
  // ------------------------------------
  const edgeMeshes: Mesh[] = [];
  const edgeMaterials: StandardMaterial[] = [];
  const EDGE_THICK = 0.1;
  const EDGE_LEN = CUBE_SIZE * 0.92;

  EDGES.forEach((edge, i) => {
    const edgeMesh = MeshBuilder.CreateBox(
      `edge_${i}`,
      { width: EDGE_THICK, height: EDGE_THICK, depth: EDGE_LEN },
      gizmoScene,
    );
    const pos = edge.dir.scale(half + 0.03);
    edgeMesh.position = pos;

    const adj = edge.adjFaces;
    const n1 = FACES.find((f) => f.name === adj[0])!.normal;
    const n2 = FACES.find((f) => f.name === adj[1])!.normal;
    const edgeDir = Vector3.Cross(n1, n2).normalize();

    const from = new Vector3(0, 0, 1);
    const dot = Vector3.Dot(from, edgeDir);
    if (dot < -0.9999) {
      edgeMesh.rotation.x = Math.PI;
    } else if (dot < 0.9999) {
      const axis = Vector3.Cross(from, edgeDir).normalize();
      const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
      edgeMesh.rotationQuaternion = Quaternion.RotationAxis(axis, angle);
    }

    const mat = new StandardMaterial(`edgeMat_${i}`, gizmoScene);
    mat.diffuseColor = HOVER_EDGE_COLOR;
    mat.emissiveColor = HOVER_EDGE_COLOR;
    mat.specularColor = new Color3(0, 0, 0);
    mat.alpha = 0;
    mat.unlit = true;
    edgeMesh.material = mat;
    edgeMesh.isPickable = false;
    edgeMeshes.push(edgeMesh);
    edgeMaterials.push(mat);
  });

  // ------------------------------------
  // Corner spheres (visual only)
  // ------------------------------------
  const cornerMeshes: Mesh[] = [];
  const cornerMaterials: StandardMaterial[] = [];

  CORNERS.forEach((corner, i) => {
    const sphere = MeshBuilder.CreateSphere(`corner_${i}`, { diameter: 0.3 }, gizmoScene);
    sphere.position = corner.dir.scale(half + 0.04);

    const mat = new StandardMaterial(`cornerMat_${i}`, gizmoScene);
    mat.diffuseColor = HOVER_CORNER_GLOW;
    mat.emissiveColor = HOVER_CORNER_GLOW;
    mat.specularColor = new Color3(0, 0, 0);
    mat.alpha = 0;
    mat.unlit = true;
    sphere.material = mat;
    sphere.isPickable = false;
    cornerMeshes.push(sphere);
    cornerMaterials.push(mat);
  });

  // ==========================================
  // Interaction — DOM events + math
  // ==========================================

  let hoveredFaceIdx: number | null = null;
  let hoveredEdgeIdx: number | null = null;
  let hoveredCornerIdx: number | null = null;

  function resetAllHighlights() {
    if (hoveredFaceIdx !== null) {
      faceMaterials[hoveredFaceIdx].emissiveColor = FACES[hoveredFaceIdx].baseColor.scale(0.15);
      hoveredFaceIdx = null;
    }
    if (hoveredEdgeIdx !== null) {
      edgeMaterials[hoveredEdgeIdx].alpha = 0;
      for (const fname of EDGES[hoveredEdgeIdx].adjFaces) {
        const fi = FACES.findIndex((f) => f.name === fname);
        if (fi >= 0) faceMaterials[fi].emissiveColor = FACES[fi].baseColor.scale(0.15);
      }
      hoveredEdgeIdx = null;
    }
    if (hoveredCornerIdx !== null) {
      cornerMaterials[hoveredCornerIdx].alpha = 0;
      for (const fname of CORNERS[hoveredCornerIdx].adjFaces) {
        const fi = FACES.findIndex((f) => f.name === fname);
        if (fi >= 0) faceMaterials[fi].emissiveColor = FACES[fi].baseColor.scale(0.15);
      }
      hoveredCornerIdx = null;
    }
  }

  /** Get the camera viewing direction in world space. */
  function getCamDir(): Vector3 {
    return new Vector3(
      -Math.sin(gizmoCamera.alpha) * Math.sin(gizmoCamera.beta),
      Math.cos(gizmoCamera.beta),
      -Math.cos(gizmoCamera.alpha) * Math.sin(gizmoCamera.beta),
    );
  }

  /**
   * Project a 3D point onto the orthographic canvas.
   * Returns {x, y} in canvas pixels (0..GIZMO_SIZE).
   */
  function projectToCanvas(p: Vector3): { x: number; y: number } {
    // Orthographic projection: just drop the depth axis
    // Camera looks from (alpha, beta) toward origin.
    // We need to project into camera's local XY plane.
    const dir = getCamDir().normalize();
    const right = Vector3.Cross(new Vector3(0, 1, 0), dir).normalize();
    const up = Vector3.Cross(dir, right).normalize();

    const cx = Vector3.Dot(p, right);
    const cy = Vector3.Dot(p, up);

    // Map from world units to canvas pixels
    const scale = GIZMO_SIZE / (orthoSize * 2);
    return {
      x: GIZMO_SIZE / 2 + cx * scale,
      y: GIZMO_SIZE / 2 - cy * scale,
    };
  }

  /**
   * Hit test: given mouse canvas coords, return what's under the cursor.
   * Uses projected 3D positions of corners, edges, and faces.
   */
  function hitTest(
    cx: number,
    cy: number,
  ): { type: "face" | "edge" | "corner"; idx: number } | null {
    const camDir = getCamDir().normalize();
    const CORNER_R = 12; // px radius for corner detection
    const EDGE_R = 6; // px radius for edge detection

    // 1) Check corners (smallest targets first — highest priority)
    for (let i = 0; i < CORNERS.length; i++) {
      if (Vector3.Dot(CORNERS[i].dir, camDir) < 0) continue; // skip back-facing
      const p = projectToCanvas(CORNERS[i].dir.scale(half));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < CORNER_R) return { type: "corner", idx: i };
    }

    // 2) Check edges — project edge midpoint and check distance
    for (let i = 0; i < EDGES.length; i++) {
      if (Vector3.Dot(EDGES[i].dir, camDir) < 0) continue;
      const p = projectToCanvas(EDGES[i].dir.scale(half));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < EDGE_R) return { type: "edge", idx: i };
    }

    // 3) Check faces — find the face whose projected center is closest
    let bestFace = -1;
    let bestDist = Infinity;
    for (let i = 0; i < FACES.length; i++) {
      if (Vector3.Dot(FACES[i].normal, camDir) < 0) continue;
      const p = projectToCanvas(FACES[i].normal.scale(half));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < bestDist) {
        bestDist = d;
        bestFace = i;
      }
    }
    if (bestFace >= 0 && bestDist < GIZMO_SIZE / 2) return { type: "face", idx: bestFace };

    return null;
  }

  // Drag state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragLastX = 0;
  let dragLastY = 0;
  const DRAG_THRESHOLD = 3;

  gizmoCanvas.addEventListener("pointerdown", (e) => {
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
  });

  gizmoCanvas.addEventListener("pointermove", (e) => {
    const rect = gizmoCanvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!isDragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      // Hover
      resetAllHighlights();
      const hit = hitTest(cx, cy);
      if (hit) {
        if (hit.type === "edge") {
          edgeMaterials[hit.idx].alpha = 0.8;
          hoveredEdgeIdx = hit.idx;
          for (const fn of EDGES[hit.idx].adjFaces) {
            const fi = FACES.findIndex((f) => f.name === fn);
            if (fi >= 0) faceMaterials[fi].emissiveColor = HOVER_EDGE_COLOR.scale(0.3);
          }
        } else if (hit.type === "corner") {
          cornerMaterials[hit.idx].alpha = 0.9;
          hoveredCornerIdx = hit.idx;
          for (const fn of CORNERS[hit.idx].adjFaces) {
            const fi = FACES.findIndex((f) => f.name === fn);
            if (fi >= 0) faceMaterials[fi].emissiveColor = HOVER_CORNER_GLOW.scale(0.3);
          }
        } else {
          faceMaterials[hit.idx].emissiveColor = HOVER_FACE_COLOR.scale(0.5);
          hoveredFaceIdx = hit.idx;
        }
        gizmoCanvas.style.cursor = "pointer";
      } else {
        gizmoCanvas.style.cursor = "default";
      }
      return;
    }

    // Drag
    if (!isDragging) {
      isDragging = true;
      gizmoCanvas.style.cursor = "grabbing";
    }
    const moveX = e.clientX - dragLastX;
    const moveY = e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;

    const sensitivity = 0.008;
    const newAlpha = gizmoCamera.alpha - moveX * sensitivity;
    const newBeta = Math.max(0.1, Math.min(Math.PI - 0.1, gizmoCamera.beta + moveY * sensitivity));
    gizmoCamera.alpha = newAlpha;
    gizmoCamera.beta = newBeta;
    callbacks.onViewChange({ alpha: newAlpha, beta: newBeta });
  });

  gizmoCanvas.addEventListener("pointerup", (e) => {
    if (!isDragging) {
      const rect = gizmoCanvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) {
        let dir: Vector3;
        if (hit.type === "corner") dir = CORNERS[hit.idx].dir;
        else if (hit.type === "edge") dir = EDGES[hit.idx].dir;
        else dir = FACES[hit.idx].normal;

        const alpha = Math.atan2(dir.x, dir.z);
        const hDist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
        const beta = Math.max(0.1, Math.min(Math.PI - 0.1, Math.atan2(hDist, dir.y)));
        animateGizmoCamera(alpha, beta);
        callbacks.onViewChange({ alpha, beta });
      }
    }
    isDragging = false;
  });

  // Disable BabylonJS pointer handling — all interaction via DOM
  gizmoScene.onPointerDown = () => {};
  gizmoScene.onPointerMove = () => {};

  // ------------------------------------
  // Gizmo camera animation (CubicEase 400ms)
  // ------------------------------------
  let currentGizmoAnims: Animation[] | null = null;

  function animateGizmoCamera(targetAlpha: number, targetBeta: number) {
    if (currentGizmoAnims) {
      gizmoScene.stopAnimation(gizmoCamera);
      currentGizmoAnims = null;
    }
    callbacks.onAnimating?.(true);

    const frameCount = Math.max(1, Math.round((ANIM_DURATION_MS / 1000) * 60));
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

    const alphaAnim = new Animation(
      "vcAlpha",
      "alpha",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    alphaAnim.setKeys([
      { frame: 0, value: gizmoCamera.alpha },
      { frame: frameCount, value: targetAlpha },
    ]);
    alphaAnim.setEasingFunction(ease);

    const betaAnim = new Animation(
      "vcBeta",
      "beta",
      60,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    betaAnim.setKeys([
      { frame: 0, value: gizmoCamera.beta },
      { frame: frameCount, value: targetBeta },
    ]);
    betaAnim.setEasingFunction(ease);

    currentGizmoAnims = [alphaAnim, betaAnim];
    gizmoScene.beginDirectAnimation(gizmoCamera, currentGizmoAnims, 0, frameCount, false, 1, () => {
      currentGizmoAnims = null;
      callbacks.onAnimating?.(false);
    });
  }

  // ------------------------------------
  // Rotation sync
  // ------------------------------------
  gizmoScene.onBeforeRenderObservable.add(() => {
    if (!currentGizmoAnims) {
      gizmoCamera.alpha = mainCamera.alpha;
      gizmoCamera.beta = mainCamera.beta;
    }
  });

  gizmoEngine.runRenderLoop(() => {
    gizmoScene.render();
  });

  // ------------------------------------
  // Cleanup
  // ------------------------------------
  return {
    dispose() {
      gizmoEngine.stopRenderLoop();
      gizmoScene.dispose();
      gizmoEngine.dispose();
      gizmoCanvas.remove();
    },
  };
}
