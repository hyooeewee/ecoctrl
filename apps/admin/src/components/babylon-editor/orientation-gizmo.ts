// ========================================
// CAD-style Orientation Gizmo (BabylonJS)
// ========================================
// A small 3D cube overlay in the top-right corner of the viewport.
// Syncs rotation with the main camera. Clickable faces, edges, and corners
// trigger preset camera animations.

import {
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  type Engine,
} from "@babylonjs/core";

// ========================================
// Types
// ========================================

export interface GizmoCallbacks {
  /** Called when a face/edge/corner is clicked. Receives the target camera direction. */
  onViewChange: (position: Vector3, lookAt: Vector3) => void;
  /** Called when the capture button is clicked. */
  onCapture?: () => void;
}

interface GizmoFace {
  name: string;
  normal: Vector3;
  color: Color3;
}

// ========================================
// Face definitions
// ========================================

const FACES: GizmoFace[] = [
  { name: "右", normal: new Vector3(1, 0, 0), color: new Color3(0.96, 0.62, 0.04) },
  { name: "左", normal: new Vector3(-1, 0, 0), color: new Color3(0.06, 0.72, 0.51) },
  { name: "顶", normal: new Vector3(0, 1, 0), color: new Color3(0.94, 0.27, 0.27) },
  { name: "底", normal: new Vector3(0, -1, 0), color: new Color3(0.55, 0.36, 0.96) },
  { name: "前", normal: new Vector3(0, 0, -1), color: new Color3(0.23, 0.51, 0.96) },
  { name: "后", normal: new Vector3(0, 0, 1), color: new Color3(0.39, 0.53, 0.96) },
];

// Edge directions (normalized midpoints between two face normals)
const EDGES = [
  { name: "右上", dir: new Vector3(1, 1, 0).normalize() },
  { name: "左上", dir: new Vector3(-1, 1, 0).normalize() },
  { name: "右下", dir: new Vector3(1, -1, 0).normalize() },
  { name: "左下", dir: new Vector3(-1, -1, 0).normalize() },
  { name: "前上", dir: new Vector3(0, 1, -1).normalize() },
  { name: "后上", dir: new Vector3(0, 1, 1).normalize() },
  { name: "前下", dir: new Vector3(0, -1, -1).normalize() },
  { name: "后下", dir: new Vector3(0, -1, 1).normalize() },
  { name: "右前", dir: new Vector3(1, 0, -1).normalize() },
  { name: "右后", dir: new Vector3(1, 0, 1).normalize() },
  { name: "左前", dir: new Vector3(-1, 0, -1).normalize() },
  { name: "左后", dir: new Vector3(-1, 0, 1).normalize() },
];

// Corner directions
const CORNERS = [
  { name: "右上前", dir: new Vector3(1, 1, -1).normalize() },
  { name: "右上后", dir: new Vector3(1, 1, 1).normalize() },
  { name: "左上前", dir: new Vector3(-1, 1, -1).normalize() },
  { name: "左上后", dir: new Vector3(-1, 1, 1).normalize() },
  { name: "右下前", dir: new Vector3(1, -1, -1).normalize() },
  { name: "右下后", dir: new Vector3(1, -1, 1).normalize() },
  { name: "左下前", dir: new Vector3(-1, -1, -1).normalize() },
  { name: "左下后", dir: new Vector3(-1, -1, 1).normalize() },
];

// ========================================
// Gizmo setup
// ========================================

const GIZMO_SIZE = 100; // pixels
const CUBE_SIZE = 1.6;
const CAMERA_DISTANCE = 4.5;

export function createOrientationGizmo(
  mainEngine: Engine,
  mainCamera: ArcRotateCamera,
  container: HTMLElement,
  callbacks: GizmoCallbacks,
): { dispose: () => void } {
  // Create a small overlay canvas
  const gizmoCanvas = document.createElement("canvas");
  gizmoCanvas.width = GIZMO_SIZE * (window.devicePixelRatio || 1);
  gizmoCanvas.height = GIZMO_SIZE * (window.devicePixelRatio || 1);
  gizmoCanvas.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    width: ${GIZMO_SIZE}px;
    height: ${GIZMO_SIZE}px;
    pointer-events: auto;
    cursor: pointer;
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
  `;
  container.style.position = "relative";
  container.appendChild(gizmoCanvas);

  // Create a separate engine + scene for the gizmo
  const gizmoEngine = new (mainEngine.constructor as any)(gizmoCanvas, {
    preserveDrawingBuffer: true,
    stencil: true,
  }) as Engine;
  gizmoEngine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));

  const gizmoScene = new Scene(gizmoEngine);
  gizmoScene.clearColor = new Color4(0, 0, 0, 0);

  // Camera — always looking at origin
  const gizmoCamera = new ArcRotateCamera(
    "gizmoCam",
    mainCamera.alpha,
    mainCamera.beta,
    CAMERA_DISTANCE,
    Vector3.Zero(),
    gizmoScene,
  );
  gizmoCamera.mode = 1; // Orthographic
  const orthoSize = 1.8;
  gizmoCamera.orthoLeft = -orthoSize;
  gizmoCamera.orthoRight = orthoSize;
  gizmoCamera.orthoTop = orthoSize;
  gizmoCamera.orthoBottom = -orthoSize;
  gizmoCamera.minZ = 0.1;
  gizmoCamera.maxZ = 20;

  // Lighting
  const light = new HemisphericLight("light", new Vector3(0, 1, -0.5), gizmoScene);
  light.intensity = 1.0;

  // Build the cube with labeled faces
  const cube = MeshBuilder.CreateBox("cube", { size: CUBE_SIZE }, gizmoScene);
  const faceMaterials: StandardMaterial[] = [];

  FACES.forEach((face, i) => {
    const mat = new StandardMaterial(`mat_${face.name}`, gizmoScene);
    mat.diffuseColor = face.color;
    mat.emissiveColor = face.color.scale(0.3);
    mat.specularColor = new Color3(0.2, 0.2, 0.2);

    // Create a texture with the face label
    const texSize = 128;
    const tex = new DynamicTexture(`tex_${face.name}`, texSize, gizmoScene, true);
    const ctx = tex.getContext();
    ctx.fillStyle = `rgb(${Math.round(face.color.r * 255)},${Math.round(face.color.g * 255)},${Math.round(face.color.b * 255)})`;
    ctx.fillRect(0, 0, texSize, texSize);
    ctx.fillStyle = "white";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(face.name, texSize / 2, texSize / 2);
    tex.update();
    mat.diffuseTexture = tex;

    faceMaterials.push(mat);
    (cube as any).setMaterialForFaceIndex(i, mat);
  });

  // Edge highlight meshes (thin boxes along each edge)
  const edgeMeshes: Mesh[] = [];
  const EDGE_LEN = CUBE_SIZE * 0.52;
  const EDGE_THICK = 0.06;
  EDGES.forEach((edge, i) => {
    // Create a thin box positioned at the edge
    const edgeMesh = MeshBuilder.CreateBox(
      `edge_${i}`,
      { width: EDGE_THICK, height: EDGE_THICK, depth: EDGE_LEN },
      gizmoScene,
    );
    // Position at the midpoint of the edge
    const halfCube = CUBE_SIZE / 2;
    const pos = edge.dir.scale(halfCube);
    edgeMesh.position = pos;
    // Orient the box along the edge direction
    edgeMesh.lookAt(pos.scale(2));

    const mat = new StandardMaterial(`edgeMat_${i}`, gizmoScene);
    mat.diffuseColor = new Color3(1, 1, 1);
    mat.emissiveColor = new Color3(0.5, 0.5, 0.5);
    mat.alpha = 0;
    edgeMesh.material = mat;
    edgeMesh.isPickable = true;
    edgeMeshes.push(edgeMesh);
  });

  // Corner spheres
  const cornerMeshes: Mesh[] = [];
  CORNERS.forEach((corner, i) => {
    const sphere = MeshBuilder.CreateSphere(`corner_${i}`, { diameter: 0.18 }, gizmoScene);
    sphere.position = corner.dir.scale(CUBE_SIZE / 2);

    const mat = new StandardMaterial(`cornerMat_${i}`, gizmoScene);
    mat.diffuseColor = new Color3(1, 1, 1);
    mat.emissiveColor = new Color3(0.5, 0.5, 0.5);
    mat.alpha = 0;
    sphere.material = mat;
    sphere.isPickable = true;
    cornerMeshes.push(sphere);
  });

  // Hover effect — show edges/corners when pointer is near
  let hoveredEdge: number | null = null;
  let hoveredCorner: number | null = null;

  gizmoScene.onPointerMove = (evt) => {
    const pick = gizmoScene.pick(evt.offsetX, evt.offsetY);
    // Reset previous hover
    if (hoveredEdge !== null && edgeMeshes[hoveredEdge]) {
      (edgeMeshes[hoveredEdge].material as StandardMaterial).alpha = 0;
      hoveredEdge = null;
    }
    if (hoveredCorner !== null && cornerMeshes[hoveredCorner]) {
      (cornerMeshes[hoveredCorner].material as StandardMaterial).alpha = 0;
      hoveredCorner = null;
    }

    if (pick?.hit && pick.pickedMesh) {
      const name = pick.pickedMesh.name;
      if (name.startsWith("edge_")) {
        const idx = parseInt(name.split("_")[1]);
        (edgeMeshes[idx].material as StandardMaterial).alpha = 0.8;
        hoveredEdge = idx;
        gizmoCanvas.style.cursor = "pointer";
      } else if (name.startsWith("corner_")) {
        const idx = parseInt(name.split("_")[1]);
        (cornerMeshes[idx].material as StandardMaterial).alpha = 0.8;
        hoveredCorner = idx;
        gizmoCanvas.style.cursor = "pointer";
      } else {
        gizmoCanvas.style.cursor = "pointer";
      }
    } else {
      gizmoCanvas.style.cursor = "default";
    }
  };

  // Click handler — determine face/edge/corner and trigger view change
  gizmoScene.onPointerDown = (evt) => {
    const pick = gizmoScene.pick(evt.offsetX, evt.offsetY);
    if (!pick?.hit || !pick.pickedMesh) return;

    const name = pick.pickedMesh.name;
    let dir: Vector3;

    if (name.startsWith("corner_")) {
      const idx = parseInt(name.split("_")[1]);
      dir = CORNERS[idx].dir;
    } else if (name.startsWith("edge_")) {
      const idx = parseInt(name.split("_")[1]);
      dir = EDGES[idx].dir;
    } else if (name === "cube" && pick.getNormal) {
      // Face click — use the face normal
      const normal = pick.getNormal(true);
      if (!normal) return;
      // Snap to nearest axis-aligned direction
      dir = snapToNearestDir(normal);
    } else {
      return;
    }

    // Calculate camera position from direction
    const distance = CAMERA_DISTANCE * 3; // Scale up for the main scene
    const position = dir.scale(distance);
    callbacks.onViewChange(position, Vector3.Zero());
  };

  // Render loop — sync gizmo camera rotation with main camera
  const observer = mainEngine.onEndFrameObservable.add(() => {
    gizmoCamera.alpha = mainCamera.alpha;
    gizmoCamera.beta = mainCamera.beta;
  });

  gizmoEngine.runRenderLoop(() => {
    gizmoScene.render();
  });

  // Cleanup
  return {
    dispose() {
      mainEngine.onEndFrameObservable.remove(observer);
      gizmoEngine.stopRenderLoop();
      gizmoScene.dispose();
      gizmoEngine.dispose();
      gizmoCanvas.remove();
    },
  };
}

// ========================================
// Helpers
// ========================================

/**
 * Snap a direction vector to the nearest axis-aligned, edge, or corner direction.
 */
function snapToNearestDir(normal: Vector3): Vector3 {
  const allDirs = [
    ...FACES.map((f) => f.normal),
    ...EDGES.map((e) => e.dir),
    ...CORNERS.map((c) => c.dir),
  ];

  let best = allDirs[0];
  let bestDot = -Infinity;
  for (const dir of allDirs) {
    const dot = Vector3.Dot(normal, dir);
    if (dot > bestDot) {
      bestDot = dot;
      best = dir;
    }
  }
  return best;
}
