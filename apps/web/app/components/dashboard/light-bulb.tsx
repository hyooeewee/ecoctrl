import { cn } from "~/lib/utils";

// ========================================
// Three-state light bulb control
// States: off | half | on
// Click only toggles off ↔ on; half is backend-only
// ========================================

interface LightBulbProps {
  status: "off" | "half" | "on";
  onClick?: () => void;
  size?: number;
  className?: string;
}

const STATUS_STYLES: Record<
  LightBulbProps["status"],
  { bulb: string; glow: string; cursor: string }
> = {
  off: {
    bulb: "fill-[#6b7280] stroke-[#9ca3af]",
    glow: "opacity-0",
    cursor: "cursor-pointer",
  },
  half: {
    bulb: "fill-[#a3a329] stroke-[#ca8a04]",
    glow: "opacity-40",
    cursor: "cursor-default",
  },
  on: {
    bulb: "fill-[#facc15] stroke-[#eab308]",
    glow: "opacity-70",
    cursor: "cursor-pointer",
  },
};

export function LightBulb({ status, onClick, size = 28, className }: LightBulbProps) {
  const style = STATUS_STYLES[status];

  // Only allow click on off/on, not half
  const handleClick = status === "half" ? undefined : onClick;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center transition-transform",
        style.cursor,
        status !== "half" && "hover:scale-110 active:scale-95",
        className,
      )}
      aria-label={`Light ${status}`}
    >
      {/* Glow effect behind bulb */}
      <div
        className={cn(
          "absolute size-10 rounded-full bg-yellow-400 blur-md transition-opacity duration-500",
          style.glow,
        )}
      />

      {/* Bulb SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Bulb body */}
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"
          className={cn("transition-colors duration-500", style.bulb)}
          strokeWidth="1.5"
        />
        {/* Base / screw cap */}
        <path
          d="M9 21h6M10 19h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-gray-400"
        />
        {/* Light rays for ON state */}
        {status === "on" && (
          <g className="text-yellow-300" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="0" x2="12" y2="1" />
            <line x1="4.22" y1="4.22" x2="4.93" y2="4.93" />
            <line x1="19.78" y1="4.22" x2="19.07" y2="4.93" />
            <line x1="1" y1="9" x2="2" y2="9" />
            <line x1="22" y1="9" x2="23" y2="9" />
          </g>
        )}
      </svg>
    </button>
  );
}
