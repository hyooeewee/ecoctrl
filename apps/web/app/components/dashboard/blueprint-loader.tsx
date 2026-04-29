import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface BlueprintLoaderProps {
  progress: number;
}

/**
 * Lottie loading animation — replaces the CSS blueprint animation.
 *
 * The lottie file auto-plays in a loop while the model loads.
 * Fades out when progress reaches 100%.
 */
export function BlueprintLoader({ progress }: BlueprintLoaderProps) {
  const p = Math.max(0, Math.min(progress, 100));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (p >= 100) {
      const t = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(t);
    }
  }, [p]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#060d18]"
      style={{
        opacity: p >= 100 ? 0 : 1,
        transition: "opacity 0.5s ease-out",
      }}
    >
      {/* Lottie canvas */}
      <div className="h-64 w-64">
        <DotLottieReact
          src="/loading.lottie"
          autoplay
          loop
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Progress indicator */}
      <div className="flex flex-col items-end gap-2">
        <span className="font-mono text-sm tracking-[0.2em] text-white/50">{Math.round(p)}%</span>
        <div className="h-[2px] w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-cyber-cyan/70" style={{ width: `${p}%` }} />
        </div>
      </div>
    </div>
  );
}
