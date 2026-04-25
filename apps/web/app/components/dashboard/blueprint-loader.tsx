import { useMemo } from "react";

interface BlueprintLoaderProps {
  progress: number;
}

/**
 * Blueprint peel-off loading animation — tears downward from the top edge.
 *
 * Simulates pulling a blueprint off the screen from the top:
 *  0–20%   : fully flat, barely moving
 *  20–60%  : top edge curls inward and downward (rotateX + translateY)
 *  60–85%  : accelerates downward tear, paper twists and drops
 *  85–100% : falls away completely while fading out
 */
export function BlueprintLoader({ progress }: BlueprintLoaderProps) {
  const p = Math.max(0, Math.min(progress, 100));

  const curl = useMemo(() => {
    const raw = (p - 20) / 40;
    return Math.max(0, Math.min(raw, 1));
  }, [p]);

  const tear = useMemo(() => {
    const raw = (p - 60) / 25;
    return Math.max(0, Math.min(raw, 1));
  }, [p]);

  const fade = useMemo(() => {
    const raw = (p - 85) / 15;
    return Math.max(0, Math.min(raw, 1));
  }, [p]);

  // Curl from the top: rotateX negative rolls the top edge backward (into screen)
  const rotateX = -curl * 18 - tear * 35; // total -53deg at full tear
  const rotateY = curl * 3 + tear * 8; // slight sideways tilt
  const rotateZ = curl * 1.5 - tear * 6; // twists as it tears
  const translateY = curl * 6 + tear * 35; // drops downward (vh units applied later)
  const translateZ = curl * 60 + tear * 40; // lifts toward viewer
  const scaleX = 1 - tear * 0.04; // slight compression during tear
  const skewX = tear * 3; // paper twists as it rips
  const opacity = 1 - fade;

  // Shadow intensifies as the paper curls away from the wall
  const shadowBlur = curl * 30 + tear * 60;
  const shadowY = curl * 12 + tear * 30;
  const shadowAlpha = 0.2 + curl * 0.3 + tear * 0.3;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-[#002a6c]">
      {/* Dark wall revealed behind the blueprint */}
      <div className="absolute inset-0 bg-[#001e4f]" />

      {/* Blueprint sheet container — centered at top */}
      <div
        className="relative mt-[5vh]"
        style={{ perspective: "1200px", perspectiveOrigin: "50% 30%" }}
      >
        {/* Back-face shadow (simulates the dark underside of the curled paper) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-sm bg-black/40"
          style={{
            transformOrigin: "50% 0%",
            transform: `
              rotateX(${rotateX * 0.6}deg)
              translateY(${translateY * 0.5}px)
              translateZ(-12px)
            `,
            opacity: curl * 0.5 + tear * 0.8,
            filter: `blur(${shadowBlur * 0.6}px)`,
          }}
        />

        {/* Main blueprint */}
        <div
          className="relative"
          style={{
            transformOrigin: "50% 0%",
            transform: `
              rotateX(${rotateX}deg)
              rotateY(${rotateY}deg)
              rotateZ(${rotateZ}deg)
              translateY(${translateY}vh)
              translateZ(${translateZ}px)
              scaleX(${scaleX})
              skewX(${skewX}deg)
            `,
            opacity,
            filter:
              p > 20
                ? `drop-shadow(0px ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`
                : "none",
          }}
        >
          <img
            src="/loading-blueprint.png"
            alt="Loading blueprint"
            className="max-h-[80vh] max-w-[90vw] object-contain select-none rounded-sm"
            draggable={false}
          />

          {/* Crease / fold highlight along the top curling edge */}
          <div
            className="pointer-events-none absolute inset-0 rounded-sm"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.08) 8%, transparent 22%)",
              opacity: curl * 0.7 + tear * 0.3,
            }}
          />

          {/* Subtle tear-line distortion near the bottom as it rips */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)",
              opacity: tear * 0.6,
              transform: `translateY(${tear * 4}px)`,
            }}
          />
        </div>
      </div>

      {/* Progress indicator — sticks near bottom, fades last */}
      <div
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
        style={{ opacity: 1 - fade * 0.5 }}
      >
        <span className="font-mono text-sm tracking-[0.2em] text-white/50">{Math.round(p)}%</span>
        <div className="h-[2px] w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-cyber-cyan/70" style={{ width: `${p}%` }} />
        </div>
      </div>
    </div>
  );
}
