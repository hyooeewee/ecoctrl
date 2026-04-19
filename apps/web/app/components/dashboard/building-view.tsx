import {
  ArcRotateCamera,
  Color4,
  CubicEase,
  EasingFunction,
  Engine,
  GlowLayer,
  HemisphericLight,
  Matrix,
  PointerEventTypes,
  Scene,
  TransformNode,
  SceneLoader,
  Vector3,
  Animation,
  type Nullable,
} from "@babylonjs/core";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import "@babylonjs/loaders/glTF";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useSettingsStore } from "~/store/settings";

// ─── 3D-projected area label floating pill ────────────────────────────────────

const AreaLabel = forwardRef<HTMLDivElement, { label: string }>(function AreaLabel({ label }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "border-cyber-cyan/40 bg-panel-dark/90 pointer-events-none absolute top-0 left-0 flex items-center gap-1.5 rounded border",
        "px-2 py-1 text-[11px] font-medium tracking-wide text-cyan-200/90 backdrop-blur-sm",
      )}
      style={{ willChange: "transform" }}
    >
      <span className="bg-cyber-cyan/70 size-1.5 rounded-full" />
      {label}
    </div>
  );
});

// Label definitions: fallback world positions + mesh name keywords
interface LabelDef {
  key: string;
  label: string;
  fallbackPosition: Vector3;
  meshKeywords: string[];
}

export interface BuildingViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
}

// ─── Animate single camera property ───────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export const BuildingView = forwardRef<BuildingViewRef, { className?: string }>(
  function BuildingView({ className }, ref) {
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

    const {
      autoRotate,
      rotateSpeed,
      showLabels,
      glowIntensity,
      defaultCameraRadius,
      defaultRotationY,
    } = useSettingsStore();
    const t = useLocale();

    const LABELS: LabelDef[] = [
      {
        key: "office1",
        label: t.building.officeArea,
        fallbackPosition: new Vector3(-4, 2.5, -3),
        meshKeywords: ["office", "办公"],
      },
      {
        key: "meeting",
        label: t.building.meetingArea,
        fallbackPosition: new Vector3(0, 3.2, -3),
        meshKeywords: ["meeting", "会议"],
      },
      {
        key: "dataCenter",
        label: t.building.dataCenter,
        fallbackPosition: new Vector3(-1.5, 1.5, 0),
        meshKeywords: ["data", "server", "机房", "数据"],
      },
      {
        key: "exhibition",
        label: t.building.exhibitionHall,
        fallbackPosition: new Vector3(2.5, 2.2, -2),
        meshKeywords: ["exhibition", "hall", "展示", "展厅"],
      },
      {
        key: "office2",
        label: t.building.officeArea,
        fallbackPosition: new Vector3(3.5, 2.5, -3),
        meshKeywords: ["office", "办公"],
      },
      {
        key: "lobby",
        label: t.building.lobby,
        fallbackPosition: new Vector3(3.5, 0.8, 2),
        meshKeywords: ["lobby", "大堂", "大厅", "entrance"],
      },
    ];

    // Sync glow intensity in real time
    useEffect(() => {
      const glow = glowRef.current;
      if (glow) {
        glow.intensity = glowIntensity;
      }
    }, [glowIntensity]);

    // Sync default camera radius in real time
    useEffect(() => {
      const camera = cameraRef.current;
      if (camera) {
        animateCameraRadius(camera, defaultCameraRadius);
      }
    }, [defaultCameraRadius]);

    // Sync default rotation Y in real time
    useEffect(() => {
      const root = rootMeshRef.current;
      if (root) {
        root.rotation.y = (defaultRotationY * Math.PI) / 180;
      }
    }, [defaultRotationY]);

    // Hard-coded initial camera values
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
      cameraRef.current = camera;

      // Use BabylonJS built-in camera controls; observe pointer events via
      // onPointerObservable so we can pause auto-rotate during interaction.
      const pointerObserver = scene.onPointerObservable.add((eventData) => {
        if (eventData.type === PointerEventTypes.POINTERDOWN) {
          isInteractingRef.current = true;
        } else if (
          eventData.type === PointerEventTypes.POINTERUP ||
          eventData.type === PointerEventTypes.POINTERCANCEL
        ) {
          isInteractingRef.current = false;
        }
      });

      const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.6;

      // Glow layer for cyber aesthetic
      const glow = new GlowLayer("glow", scene);
      glow.intensity = glowIntensity;
      glowRef.current = glow;

      // Create a pivot node that we explicitly rotate so we don't depend on GLB root naming.
      const pivot = new TransformNode("rotationPivot", scene);
      pivot.rotation.y = (defaultRotationY * Math.PI) / 180;
      rootMeshRef.current = pivot;

      SceneLoader.ImportMeshAsync("", "/", "building.glb", scene, (event) => {
        if (event.lengthComputable) {
          const pct = (event.loaded / event.total) * 100;
          // eslint-disable-next-line no-console
          console.log(`Loading building.glb: ${pct.toFixed(0)}%`);
        }
      })
        .then((result) => {
          const firstMesh = result.meshes[0];
          if (firstMesh) {
            const glbRoot = scene.getTransformNodeByName("__root__") ?? firstMesh;
            // Parent the GLB root to our pivot so rotating the pivot rotates the whole building.
            glbRoot.parent = pivot;

            const { min, max } = firstMesh.getHierarchyBoundingVectors(true);
            const size = max.subtract(min);
            const center = min.add(size.scale(0.5));
            const maxSize = Math.max(size.x, size.y, size.z);
            const scale = maxSize > 0 ? 10 / maxSize : 1;

            glbRoot.position.x = -center.x * scale;
            glbRoot.position.y = -min.y * scale; // sit on ground
            glbRoot.position.z = -center.z * scale;
            glbRoot.scaling.scaleInPlace(scale);

            // Adjust camera target to model center after scaling
            const target = new Vector3(0, (size.y * scale) / 2, 0);
            camera.setTarget(target);

            // Build label anchors by matching mesh names or falling back to preset positions
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
              // eslint-disable-next-line no-console
              console.log(
                `[ecoctrl] label "${cfg.key}" anchored to`,
                node ? node.name : "fallback",
                worldPos,
              );
              return { key: cfg.key, worldPos };
            });

            // eslint-disable-next-line no-console
            console.log("[ecoctrl] GLB loaded, pivot created, root parented:", glbRoot.name);
          }
          scene.stopAllAnimations();
          setLoaded(true);
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("Failed to load building.glb:", err);
        });

      engine.runRenderLoop(() => {
        // Auto-rotate camera alpha when idle
        if (autoRotate && !isInteractingRef.current) {
          camera.alpha += 0.002 * rotateSpeed;
        }

        scene.render();

        // Project 3D label anchors to 2D screen positions every frame
        if (camera && labelAnchorsRef.current.length) {
          const renderWidth = engine.getRenderWidth();
          const renderHeight = engine.getRenderHeight();
          const transformMatrix = scene.getTransformMatrix();
          const globalViewport = camera.viewport.toGlobal(renderWidth, renderHeight);

          labelAnchorsRef.current.forEach(({ key, worldPos }) => {
            const el = labelElsRef.current[key];
            if (!el) return;
            const p = Vector3.Project(worldPos, Matrix.Identity(), transformMatrix, globalViewport);
            const visible =
              showLabels &&
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

      const handleResize = () => {
        engine.resize();
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        engine.stopRenderLoop();
        camera.detachControl(canvas);
        scene.onPointerObservable.remove(pointerObserver);
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
          if (!camera) return;
          const scene = camera.getScene();
          scene.stopAnimation(camera);
          camera.animations = [];
          camera.alpha = initialAlpha;
          camera.beta = initialBeta;
          camera.radius = defaultCameraRadius;
          camera.target = initialTarget.clone();
          const root = rootMeshRef.current;
          if (root) {
            root.rotation.setAll(0);
            root.rotationQuaternion = null;
            root.rotation.y = (defaultRotationY * Math.PI) / 180;
          }
        },
      }),
      [],
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

        {/* ── Floating area labels (positioned absolutely over canvas) ── */}
        {LABELS.map((cfg) => (
          <AreaLabel
            key={cfg.key}
            label={cfg.label}
            ref={(el) => {
              labelElsRef.current[cfg.key] = el;
            }}
          />
        ))}
      </div>
    );
  },
);
