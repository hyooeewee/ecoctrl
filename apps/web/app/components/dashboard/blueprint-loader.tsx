import { useMemo } from "react";

interface BlueprintLoaderProps {
  progress: number;
}

/**
 * Blueprint peel-off loading animation — peels from top-left to bottom-right.
 *
 * Simulates grabbing the top-left corner of a blueprint and flipping it
 * diagonally down-right as the model loads:
 *  0–20%   : fully flat against the wall
 *  20–60%  : top-left corner lifts, paper starts curling down-right
 *  60–85%  : accelerates the diagonal flip, paper twists and drifts
 *  85–100% : flies away to bottom-right while fading out
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

  // Flip from top-left to bottom-right
  // rotateX positive = top edge flips down toward viewer
  // rotateY negative = left edge flips right toward viewer
  const rotateX = curl * 22 + tear * 48; // 0 -> 70deg
  const rotateY = -(curl * 12 + tear * 38); // 0 -> -50deg
  const rotateZ = tear * 10; // slight twist while flying
  const translateX = curl * 6 + tear * 45; // vw
  const translateY = curl * 5 + tear * 40; // vh
  const translateZ = curl * 50 + tear * 80; // lift off wall
  const opacity = 1 - fade;

  // Shadow shifts to bottom-right as paper peels away
  const shadowBlur = curl * 25 + tear * 55;
  const shadowX = curl * 10 + tear * 35;
  const shadowY = curl * 14 + tear * 40;
  const shadowAlpha = 0.2 + curl * 0.25 + tear * 0.35;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start overflow-hidden bg-[#002a6c]">
      {/* Dark wall revealed behind the blueprint */}
      <div className="absolute inset-0 bg-[#001e4f]" />

      {/* Blueprint sheet container — anchored at top-left */}
      <div
        className="relative ml-[5vw] mt-[5vh]"
        style={{ perspective: "1200px", perspectiveOrigin: "10% 10%" }}
      >
        {/* Back-face shadow (dark underside of the curling paper) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-sm bg-black/50"
          style={{
            transformOrigin: "0% 0%",
            transform: `
              rotateX(${rotateX * 0.5}deg)
              rotateY(${rotateY * 0.5}deg)
              translateX(${translateX * 0.4}vw)
              translateY(${translateY * 0.4}vh)
              translateZ(-16px)
            `,
            opacity: curl * 0.4 + tear * 0.7,
            filter: `blur(${shadowBlur * 0.7}px)`,
          }}
        />

        {/* Main blueprint */}
        <div
          className="relative"
          style={{
            transformOrigin: "0% 0%",
            transform: `
              rotateX(${rotateX}deg)
              rotateY(${rotateY}deg)
              rotateZ(${rotateZ}deg)
              translateX(${translateX}vw)
              translateY(${translateY}vh)
              translateZ(${translateZ}px)
            `,
            opacity,
            filter:
              p > 20
                ? `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`
                : "none",
          }}
        >
          <img
            src="/loading-blueprint.png"
            alt="Loading blueprint"
            className="max-h-[80vh] max-w-[90vw] object-contain select-none rounded-sm"
            draggable={false}
          />

          {/* Diagonal crease highlight from top-left to bottom-right */}
          <div
            className="pointer-events-none absolute inset-0 rounded-sm"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.06) 15%, transparent 30%, transparent 70%, rgba(0,0,0,0.10) 85%, rgba(0,0,0,0.18) 100%)",
              opacity: curl * 0.8 + tear * 0.5,
            }}
          />

          {/* Subtle tear-line distortion near the peeling corner */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-full w-8"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0.20) 0%, transparent 100%)",
              opacity: tear * 0.5,
              transform: `translateX(${tear * 3}px)`,
            }}
          />
        </div>
      </div>

      {/* Progress indicator — sticks near bottom-right, fades last */}
      <div
        className="absolute bottom-10 right-10 flex flex-col items-end gap-3"
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
