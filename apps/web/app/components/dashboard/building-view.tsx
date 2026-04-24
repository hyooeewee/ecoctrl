import {
  ArcRotateCamera,
  Color4,
  CubicEase,
  EasingFunction,
  Engine,
  GlowLayer,
  HemisphericLight,
  Matrix,
  Plane,
  Scene,
  TransformNode,
  SceneLoader,
  Vector3,
  Animation,
  type Nullable,
  Viewport,
} from "@babylonjs/core";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import "@babylonjs/loaders/glTF";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useSettingsStore } from "~/store/settings";

// ─── 3D-projected area label floating pill ────────────────────────────────────

interface AreaLabelProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const AreaLabel = forwardRef<HTMLDivElement, AreaLabelProps>(function AreaLabel(
  { label, isActive, onClick },
  ref,
) {
  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "absolute top-0 left-0 flex cursor-pointer items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm transition-all",
        isActive
          ? "border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          : "border-cyber-cyan/40 bg-panel-dark/90 text-cyan-200/90 hover:border-cyber-cyan hover:bg-cyber-cyan/10 hover:text-cyber-cyan",
      )}
      style={{ willChange: "transform" }}
    >
      <span className="bg-cyber-cyan/70 size-1.5 rounded-full" />
      {label}
    </div>
  );
});

// ─── Label definitions ────────────────────────────────────────────────────────

interface LabelDef {
  key: string;
  fallbackPosition: Vector3;
  meshKeywords: string[];
  // Optimal camera angles for immersive focus on this label.
  // Beta keeps the same elevation; radius zooms in slightly.
  focusAlpha: number;
  focusBeta: number;
  focusRadius: number;
}

const LABELS: LabelDef[] = [
  {
    key: "office1",
    fallbackPosition: new Vector3(-4, 2.5, -3),
    meshKeywords: ["office", "办公"],
    focusAlpha: Math.PI * 1.1,
    focusBeta: Math.PI / 2.8,
    focusRadius: 14,
  },
  {
    key: "meeting",
    fallbackPosition: new Vector3(0, 3.2, -3),
    meshKeywords: ["meeting", "会议"],
    focusAlpha: Math.PI / 2,
    focusBeta: Math.PI / 2.8,
    focusRadius: 14,
  },
  {
    key: "dataCenter",
    fallbackPosition: new Vector3(-1.5, 1.5, 0),
    meshKeywords: ["data", "server", "机房", "数据"],
    focusAlpha: Math.PI * 1.3,
    focusBeta: Math.PI / 2.6,
    focusRadius: 12,
  },
  {
    key: "exhibition",
    fallbackPosition: new Vector3(2.5, 2.2, -2),
    meshKeywords: ["exhibition", "hall", "展示", "展厅"],
    focusAlpha: Math.PI * 0.4,
    focusBeta: Math.PI / 2.8,
    focusRadius: 14,
  },
  {
    key: "office2",
    fallbackPosition: new Vector3(3.5, 2.5, -3),
    meshKeywords: ["office", "办公"],
    focusAlpha: Math.PI * 0.8,
    focusBeta: Math.PI / 2.8,
    focusRadius: 14,
  },
  {
    key: "lobby",
    fallbackPosition: new Vector3(3.5, 0.8, 2),
    meshKeywords: ["lobby", "大堂", "大厅", "entrance"],
    focusAlpha: Math.PI * 0.15,
    focusBeta: Math.PI / 2.4,
    focusRadius: 13,
  },
];

export interface BuildingViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  ensureCloseUp: (minRadius: number) => void;
  resetToDefaultRadius: () => void;
  // NEW: animate camera to focus on a label
  focusOnLabel: (key: string) => void;
  // NEW: offset camera viewport when a sidebar is open
  setViewportOffset: (px: number) => void;
  // NEW: toggle horizontal clip plane for lobby cross-section
  setClipping: (enabled: boolean) => void;
}

// ─── Camera animation helpers ─────────────────────────────────────────────────

function animateCameraRadius(camera: ArcRotateCamera, toRadius: number, duration = 30) {
  const frameRate = 60;
  const anim = new Animation("camRadius", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  anim.setEasingFunction(easing);
  anim.setKeys([
    { frame: 0, value: camera.radius },
    { frame: duration, value: toRadius },
  ]);
  camera.animations = [anim];
  camera.getScene().beginAnimation(camera, 0, duration, false, 1, () => {
    camera.animations = [];
  });
}

// Animate alpha/beta/radius together for immersive label focus.
// Uses shortest-path interpolation for alpha to handle 0↔2π wrap.
function animateCameraTo(
  camera: ArcRotateCamera,
  toAlpha: number,
  toBeta: number,
  toRadius: number,
  duration = 45,
) {
  const frameRate = 60;
  const scene = camera.getScene();

  // Shortest delta for alpha (handles wrap-around)
  let deltaAlpha = toAlpha - camera.alpha;
  while (deltaAlpha > Math.PI) deltaAlpha -= Math.PI * 2;
  while (deltaAlpha < -Math.PI) deltaAlpha += Math.PI * 2;
  const endAlpha = camera.alpha + deltaAlpha;

  const animAlpha = new Animation("camAlpha", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animBeta = new Animation("camBeta", "beta", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animRadius = new Animation("camRadius", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT);

  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

  [animAlpha, animBeta, animRadius].forEach((a) => a.setEasingFunction(easing));

  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: duration, value: endAlpha },
  ]);
  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: duration, value: toBeta },
  ]);
  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: duration, value: toRadius },
  ]);

  camera.animations = [animAlpha, animBeta, animRadius];
  scene.beginAnimation(camera, 0, duration, false, 1, () => {
    camera.animations = [];
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BuildingViewProps {
  className?: string;
  activeLabel?: string | null;
  sidebarWidth?: number;
  onLabelClick?: (key: string) => void;
  onCanvasClick?: () => void;
}

export const BuildingView = forwardRef<BuildingViewRef, BuildingViewProps>(function BuildingView(
  { className, activeLabel, sidebarWidth = 320, onLabelClick, onCanvasClick },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Nullable<Engine>>(null);
  const sceneRef = useRef<Nullable<Scene>>(null);
  const cameraRef = useRef<Nullable<ArcRotateCamera>>(null);
  const rootMeshRef = useRef<Nullable<TransformNode>>(null);
  const labelAnchorsRef = useRef<{ key: string; worldPos: Vector3 }[]>([]);
  const labelElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const glowRef = useRef<Nullable<GlowLayer>>(null);
  const [loaded, setLoaded] = useState(false);
  const isInteractingRef = useRef(false);

  // Saved camera state after GLB load so resetCamera can truly restore initial state.
  const postLoadCameraStateRef = useRef<{
    alpha: number;
    beta: number;
    radius: number;
    target: Vector3;
  } | null>(null);

  // ─── Horizontal clip-plane state for lobby cross-section ────────────────────
  // clipTargetRef: the Y-height we want the clip plane at.
  //   A large value (999) means "no clipping" (plane above everything).
  // lobbyTopRef: world-space Y of the lobby mesh bounding box top.
  //   Detected after GLB load; used as the actual clip height.
  const clipYRef = useRef(999);
  const clipTargetRef = useRef(999);
  const lobbyTopRef = useRef(2);

  const {
    autoRotate,
    rotateSpeed,
    showLabels,
    glowIntensity,
    defaultCameraRadius,
    defaultRotationY,
  } = useSettingsStore();
  const t = useLocale();

  // Refs so runRenderLoop always sees the latest values
  const autoRotateRef = useRef(autoRotate);
  const rotateSpeedRef = useRef(rotateSpeed);
  const showLabelsRef = useRef(showLabels);
  const activeLabelRef = useRef(activeLabel);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  useEffect(() => {
    rotateSpeedRef.current = rotateSpeed;
  }, [rotateSpeed]);
  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);
  useEffect(() => {
    activeLabelRef.current = activeLabel;
  }, [activeLabel]);

  const labelText: Record<string, string> = {
    office1: t.building.officeArea,
    meeting: t.building.meetingArea,
    dataCenter: t.building.dataCenter,
    exhibition: t.building.exhibitionHall,
    office2: t.building.officeArea,
    lobby: t.building.lobby,
  };

  // Sync glow intensity
  useEffect(() => {
    const glow = glowRef.current;
    if (glow) glow.intensity = glowIntensity;
  }, [glowIntensity]);

  // Sync default camera radius
  useEffect(() => {
    const camera = cameraRef.current;
    if (camera) animateCameraRadius(camera, defaultCameraRadius);
  }, [defaultCameraRadius]);

  // Sync default rotation Y
  useEffect(() => {
    const root = rootMeshRef.current;
    if (root) root.rotation.y = (defaultRotationY * Math.PI) / 180;
  }, [defaultRotationY]);

  // Sync viewport offset when sidebar width changes
  useEffect(() => {
    const camera = cameraRef.current;
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!camera || !engine || !canvas) return;

    const w = canvas.clientWidth;
    if (sidebarWidth > 0 && w > 0) {
      const x = sidebarWidth / w;
      camera.viewport = new Viewport(x, 0, 1 - x, 1);
    } else {
      camera.viewport = new Viewport(0, 0, 1, 1);
    }
  }, [sidebarWidth]);

  const initialAlpha = Math.PI / 4;
  const initialBeta = Math.PI / 2.8;
  const initialTarget = new Vector3(0, 2, 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new Color4(6 / 255, 13 / 255, 24 / 255, 1);

    const camera = new ArcRotateCamera(
      "camera",
      initialAlpha,
      initialBeta,
      defaultCameraRadius,
      initialTarget.clone(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 60;
    camera.lowerBetaLimit = 0.1;
    camera.upperBetaLimit = Math.PI / 2.2;
    camera.viewport = new Viewport(0, 0, 1, 1);
    cameraRef.current = camera;

    // Track user interaction
    const onPointerDown = () => {
      isInteractingRef.current = true;
    };
    const onPointerUp = () => {
      isInteractingRef.current = false;
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);

    // Click on blank canvas to close immersive label view
    scene.onPointerDown = (_evt, pickInfo) => {
      if (activeLabelRef.current && pickInfo.hit === false && onCanvasClick) {
        onCanvasClick();
      }
    };

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;

    const glow = new GlowLayer("glow", scene);
    glow.intensity = glowIntensity;
    glowRef.current = glow;

    const pivot = new TransformNode("rotationPivot", scene);
    pivot.rotation.y = (defaultRotationY * Math.PI) / 180;
    rootMeshRef.current = pivot;

    SceneLoader.ImportMeshAsync("", "/", "building.glb", scene, (_event) => {
      /* progress callback empty to avoid stale closures */
    })
      .then((result) => {
        const firstMesh = result.meshes[0];
        if (firstMesh) {
          const glbRoot = scene.getTransformNodeByName("__root__") ?? firstMesh;
          glbRoot.parent = pivot;

          const { min, max } = firstMesh.getHierarchyBoundingVectors(true);
          const size = max.subtract(min);
          const center = min.add(size.scale(0.5));
          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = maxSize > 0 ? 10 / maxSize : 1;

          glbRoot.position.x = -center.x * scale;
          glbRoot.position.y = -min.y * scale;
          glbRoot.position.z = -center.z * scale;
          glbRoot.scaling.scaleInPlace(scale);

          const target = new Vector3(0, (size.y * scale) / 2, 0);
          camera.setTarget(target);

          // Snapshot the true initial camera state so resetCamera can restore it precisely.
          postLoadCameraStateRef.current = {
            alpha: camera.alpha,
            beta: camera.beta,
            radius: camera.radius,
            target: target.clone(),
          };

          const allNodes = [...scene.meshes, ...scene.transformNodes];
          const findNode = (keywords: string[]) =>
            allNodes.find((n) =>
              keywords.some((kw) => n.name.toLowerCase().includes(kw.toLowerCase())),
            );

          labelAnchorsRef.current = LABELS.map((cfg) => {
            const node = findNode(cfg.meshKeywords);
            let worldPos: Vector3;
            if (node && (node as any).getBoundingInfo) {
              worldPos = (node as any).getBoundingInfo().boundingBox.centerWorld.clone();
            } else if (node) {
              worldPos = node.getAbsolutePosition().clone();
            } else {
              worldPos = cfg.fallbackPosition.clone();
            }
            return { key: cfg.key, worldPos };
          });

          // Detect lobby top height for cross-section clip plane.
          const lobbyNode = findNode(["lobby", "大堂", "大厅", "entrance"]);
          if (lobbyNode && (lobbyNode as any).getBoundingInfo) {
            // Generous margin above lobby top so the lobby itself stays fully visible.
            lobbyTopRef.current =
              (lobbyNode as any).getBoundingInfo().boundingBox.maximumWorld.y + 1.5;
          } else {
            // Fallback: estimate lobby height as ~35% of total building height.
            // After repositioning, building base sits at y=0.
            // Estimate lobby top as ~35% of total building height.
            lobbyTopRef.current = size.y * scale * 0.35;
          }
        }
        scene.stopAllAnimations();
        setLoaded(true);
      })
      .catch((_err) => {
        /* silently ignore load errors */
      });

    engine.runRenderLoop(() => {
      if (autoRotateRef.current && !isInteractingRef.current) {
        camera.alpha += 0.002 * rotateSpeedRef.current;
      }

      scene.render();

      // Smooth horizontal clip-plane animation for lobby cross-section.
      // Plane(0, -1, 0, y) keeps everything where y <= clipY.
      const targetY = clipTargetRef.current;
      const currentY = clipYRef.current;
      if (Math.abs(currentY - targetY) > 0.01) {
        clipYRef.current += (targetY - currentY) * 0.08;
      }
      if (clipYRef.current < 900) {
        // Plane(0, 1, 0, -clipY) → y - clipY = 0.
        // Depending on BabylonJS clip-plane semantics this keeps y <= clipY.
        scene.clipPlane = new Plane(0, 1, 0, -clipYRef.current);
      } else {
        scene.clipPlane = null;
      }

      // Project 3D label anchors to 2D screen positions
      if (camera && labelAnchorsRef.current.length) {
        const renderWidth = engine.getRenderWidth();
        const renderHeight = engine.getRenderHeight();
        const transformMatrix = scene.getTransformMatrix();
        // Use camera.viewport to calculate projection bounds
        const globalViewport = camera.viewport.toGlobal(renderWidth, renderHeight);

        labelAnchorsRef.current.forEach(({ key, worldPos }) => {
          const el = labelElsRef.current[key];
          if (!el) return;
          const p = Vector3.Project(worldPos, Matrix.Identity(), transformMatrix, globalViewport);
          const visible =
            showLabelsRef.current &&
            p.z > 0 &&
            p.z < 1 &&
            p.x >= 0 &&
            p.x <= renderWidth &&
            p.y >= 0 &&
            p.y <= renderHeight;
          el.style.display = visible ? "flex" : "none";
          el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        });
      }
    });

    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      engine.stopRenderLoop();
      camera.detachControl();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rootMeshRef.current = null;
      glowRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        const camera = cameraRef.current;
        if (!camera) return;
        const next = Math.max(camera.radius * 0.8, camera.lowerRadiusLimit ?? 8);
        animateCameraRadius(camera, next);
      },
      zoomOut: () => {
        const camera = cameraRef.current;
        if (!camera) return;
        const next = Math.min(camera.radius * 1.25, camera.upperRadiusLimit ?? 60);
        animateCameraRadius(camera, next);
      },
      resetCamera: () => {
        const camera = cameraRef.current;
        const canvas = canvasRef.current;
        if (!camera) return;
        const scene = camera.getScene();
        scene.stopAnimation(camera);
        camera.animations = [];

        const saved = postLoadCameraStateRef.current;
        if (saved) {
          camera.alpha = saved.alpha;
          camera.beta = saved.beta;
          camera.radius = saved.radius;
          camera.target = saved.target.clone();
        } else {
          camera.alpha = initialAlpha;
          camera.beta = initialBeta;
          camera.radius = defaultCameraRadius;
          camera.target = initialTarget.clone();
        }

        // Reset viewport (remove sidebar offset)
        camera.viewport = new Viewport(0, 0, 1, 1);

        // Reset clip plane
        clipTargetRef.current = 999;
        clipYRef.current = 999;
        scene.clipPlane = null;

        const root = rootMeshRef.current;
        if (root) {
          root.rotation.setAll(0);
          root.rotationQuaternion = null;
          root.rotation.y = (defaultRotationY * Math.PI) / 180;
        }
      },
      ensureCloseUp: (minRadius: number) => {
        const camera = cameraRef.current;
        if (!camera) return;
        if (camera.radius >= minRadius) {
          animateCameraRadius(camera, minRadius * 0.9);
        }
      },
      resetToDefaultRadius: () => {
        const camera = cameraRef.current;
        if (!camera) return;
        animateCameraRadius(camera, defaultCameraRadius);
      },
      focusOnLabel: (key: string) => {
        const camera = cameraRef.current;
        if (!camera) return;
        const def = LABELS.find((l) => l.key === key);
        if (!def) return;
        animateCameraTo(camera, def.focusAlpha, def.focusBeta, def.focusRadius);
      },
      setViewportOffset: (px: number) => {
        const camera = cameraRef.current;
        const canvas = canvasRef.current;
        if (!camera || !canvas) return;
        const w = canvas.clientWidth;
        if (px > 0 && w > 0) {
          const x = px / w;
          camera.viewport = new Viewport(x, 0, 1 - x, 1);
        } else {
          camera.viewport = new Viewport(0, 0, 1, 1);
        }
      },
      setClipping: (enabled: boolean) => {
        // Animate clip plane toward lobbyTop (enabled) or above roof (disabled).
        clipTargetRef.current = enabled ? lobbyTopRef.current : 999;
      },
    }),
    [defaultCameraRadius, defaultRotationY],
  );

  return (
    <div className={cn("relative overflow-hidden bg-[#060d18]", className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        aria-label={t.building.ariaLabel}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-cyber-cyan/30 text-cyber-cyan rounded border bg-black/60 px-4 py-2 text-xs backdrop-blur-sm">
            {t.common.loading}
          </div>
        </div>
      )}

      {/* ── Floating area labels ── */}
      {LABELS.map((cfg) => (
        <AreaLabel
          key={cfg.key}
          label={labelText[cfg.key]}
          isActive={activeLabel === cfg.key}
          onClick={() => onLabelClick?.(cfg.key)}
          ref={(el) => {
            labelElsRef.current[cfg.key] = el;
          }}
        />
      ))}
    </div>
  );
});
