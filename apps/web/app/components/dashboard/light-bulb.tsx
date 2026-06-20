import { Lightbulb, LightbulbOff } from "lucide-react";

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

const STATUS_CONFIG: Record<
  LightBulbProps["status"],
  { icon: typeof Lightbulb; color: string; cursor: string }
> = {
  off: {
    icon: LightbulbOff,
    color: "text-gray-500",
    cursor: "cursor-pointer",
    glow: "",
  },
  half: {
    icon: Lightbulb,
    color: "text-yellow-600",
    cursor: "cursor-pointer",
    glow: "",
  },
  on: {
    icon: Lightbulb,
    color: "text-yellow-400",
    cursor: "cursor-pointer",
    glow: "drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]",
  },
};

export function LightBulb({ status, onClick, size = 20, className }: LightBulbProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-1 transition-all",
        config.cursor,
        config.color,
        config.glow,
        "hover:scale-110 hover:bg-white/10 active:scale-95",
        className,
      )}
      aria-label={`Light ${status}`}
    >
      <Icon size={size} />
    </button>
  );
}
