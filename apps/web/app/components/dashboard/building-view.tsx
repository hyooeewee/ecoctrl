import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArcRotateCamera,
  Color4,
  CubicEase,
  EasingFunction,
  Engine,
  GlowLayer,
  HemisphericLight,
  Scene,
  SceneLoader,
  Vector3,
  Animation,
  type Nullable,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

import { locale as t } from "~/locales";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ViewAngle {
  key: string;
  label: string;
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
}

// ─── Area label floating pill ─────────────────────────────────────────────────

interface AreaLabelProps {
  label: string;
  x: string;
  y: string;
}

function AreaLabel({ label, x, y }: AreaLabelProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute flex items-center gap-1.5 rounded border border-cyber-cyan/40 bg-panel-dark/90",
        "px-2 py-1 text-[11px] font-medium tracking-wide text-cyan-200/90 backdrop-blur-sm",
      )}
      style={{ left: x, top: y }}
    >
      <span className="size-1.5 rounded-full bg-cyber-cyan/70" />
      {label}
    </div>
  );
}

// ─── View angle buttons ───────────────────────────────────────────────────────

interface ViewTabsProps {
  angles: ViewAngle[];
  activeKey: string;
  onChange: (angle: ViewAngle) => void;
}

function ViewTabs({ angles, activeKey, onChange }: ViewTabsProps) {
  return (
    <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-md">
      {angles.map((angle) => {
        const active = angle.key === activeKey;
        return (
          <button
            key={angle.key}
            type="button"
            onClick={() => onChange(angle)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            {angle.label}
          </button>
        );
      })}
    </div>
  );
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

// ─── Animate camera to target angle ───────────────────────────────────────────

function animateCameraTo(
  camera: ArcRotateCamera,
  angle: ViewAngle,
  duration = 60,
) {
  const frameRate = 60;
  const totalFrames = duration;

  const animAlpha = new Animation("camAlpha", "alpha", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animBeta = new Animation("camBeta", "beta", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animRadius = new Animation("camRadius", "radius", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animTargetX = new Animation("camTargetX", "target.x", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animTargetY = new Animation("camTargetY", "target.y", frameRate, Animation.ANIMATIONTYPE_FLOAT);
  const animTargetZ = new Animation("camTargetZ", "target.z", frameRate, Animation.ANIMATIONTYPE_FLOAT);

  const easing = new CubicEase();
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
  [animAlpha, animBeta, animRadius, animTargetX, animTargetY, animTargetZ].forEach(
    (a) => a.setEasingFunction(easing),
  );

  const makeKeys = (from: number, to: number) => [
    { frame: 0, value: from },
    { frame: totalFrames, value: to },
  ];

  animAlpha.setKeys(makeKeys(camera.alpha, angle.alpha));
  animBeta.setKeys(makeKeys(camera.beta, angle.beta));
  animRadius.setKeys(makeKeys(camera.radius, angle.radius));
  animTargetX.setKeys(makeKeys(camera.target.x, angle.target.x));
  animTargetY.setKeys(makeKeys(camera.target.y, angle.target.y));
  animTargetZ.setKeys(makeKeys(camera.target.z, angle.target.z));

  camera.animations = [
    animAlpha,
    animBeta,
    animRadius,
    animTargetX,
    animTargetY,
    animTargetZ,
  ];
  camera.getScene().beginAnimation(camera, 0, totalFrames, false, 1, () => {
    camera.animations = [];
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BuildingView = forwardRef<BuildingViewRef, { className?: string }>(function BuildingView({ className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Nullable<Engine>>(null);
  const sceneRef = useRef<Nullable<Scene>>(null);
  const cameraRef = useRef<Nullable<ArcRotateCamera>>(null);
  const [activeView, setActiveView] = useState("overview");
  const [loaded, setLoaded] = useState(false);

  const viewAnglesRef = useRef<ViewAngle[]>([
    {
      key: "overview",
      label: t.building.viewOverview,
      alpha: Math.PI / 4,
      beta: Math.PI / 2.8,
      radius: 25,
      target: new Vector3(0, 2, 0),
    },
    {
      key: "top",
      label: t.building.viewTop,
      alpha: Math.PI / 4,
      beta: 0.15,
      radius: 28,
      target: new Vector3(0, 2, 0),
    },
    {
      key: "front",
      label: t.building.viewFront,
      alpha: Math.PI / 2,
      beta: Math.PI / 2.2,
      radius: 22,
      target: new Vector3(0, 2, 0),
    },
    {
      key: "side",
      label: t.building.viewSide,
      alpha: 0,
      beta: Math.PI / 2.2,
      radius: 22,
      target: new Vector3(0, 2, 0),
    },
  ]);

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
      viewAnglesRef.current[0].alpha,
      viewAnglesRef.current[0].beta,
      viewAnglesRef.current[0].radius,
      viewAnglesRef.current[0].target.clone(),
      scene,
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 60;
    cameraRef.current = camera;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.6;

    // Glow layer for cyber aesthetic
    const glow = new GlowLayer("glow", scene);
    glow.intensity = 0.4;

    SceneLoader.ImportMeshAsync(
      "",
      "/",
      "building.glb",
      scene,
      (event) => {
        if (event.lengthComputable) {
          const pct = (event.loaded / event.total) * 100;
          // eslint-disable-next-line no-console
          console.log(`Loading building.glb: ${pct.toFixed(0)}%`);
        }
      },
    )
      .then((result) => {
        // Center and scale imported mesh if needed
        const root = result.meshes[0];
        if (root) {
          const { min, max } = root.getHierarchyBoundingVectors(true);
          const size = max.subtract(min);
          const center = min.add(size.scale(0.5));
          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = maxSize > 0 ? 10 / maxSize : 1;

          root.position.x = -center.x * scale;
          root.position.y = -min.y * scale; // sit on ground
          root.position.z = -center.z * scale;
          root.scaling.scaleInPlace(scale);

          // Adjust camera target to model center after scaling
          const target = new Vector3(0, (size.y * scale) / 2, 0);
          camera.setTarget(target);
          viewAnglesRef.current.forEach((v) => {
            v.target = target.clone();
          });
        }
        setLoaded(true);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load building.glb:", err);
      });

    engine.runRenderLoop(() => {
      scene.render();
    });

    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
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
      const angle = viewAnglesRef.current.find((v) => v.key === activeView);
      if (angle) animateCameraTo(camera, angle);
    },
  }), [activeView]);

  const handleViewChange = (angle: ViewAngle) => {
    setActiveView(angle.key);
    const camera = cameraRef.current;
    if (camera) {
      animateCameraTo(camera, angle);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#060d18]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        aria-label={t.building.ariaLabel}
      />

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded border border-cyber-cyan/30 bg-black/60 px-4 py-2 text-xs text-cyber-cyan backdrop-blur-sm">
            {t.common.loading}
          </div>
        </div>
      )}

      <ViewTabs
        angles={viewAnglesRef.current}
        activeKey={activeView}
        onChange={handleViewChange}
      />

      {/* ── Floating area labels (positioned absolutely over canvas) ── */}
      <AreaLabel label={t.building.officeArea}     x="4%"  y="11%" />
      <AreaLabel label={t.building.meetingArea}    x="36%" y="7%"  />
      <AreaLabel label={t.building.dataCenter}     x="33%" y="38%" />
      <AreaLabel label={t.building.exhibitionHall} x="62%" y="20%" />
      <AreaLabel label={t.building.officeArea}     x="79%" y="11%" />
      <AreaLabel label={t.building.lobby}          x="79%" y="45%" />
    </div>
  );
});
