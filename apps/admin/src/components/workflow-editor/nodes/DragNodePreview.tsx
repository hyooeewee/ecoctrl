import React from "react";
import { LayoutTemplate } from "lucide-react";

interface DragNodePreviewProps {
  type: string;
  data: { label: string; type: string; config: Record<string, unknown> };
  color?: string;
  iconSvg?: string;
}

/** Hex color with alpha (0-255). */
function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  return `#${clean}${alpha.toString(16).padStart(2, "0")}`;
}

export const DragNodePreview: React.FC<DragNodePreviewProps> = ({
  color = "#94a3b8",
  iconSvg,
  data,
}) => {
  return (
    <div className="flex w-[280px] items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-md dark:bg-zinc-900">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: hexWithAlpha(color, 0x20), color }}
      >
        {iconSvg ? (
          <div
            dangerouslySetInnerHTML={{ __html: iconSvg }}
            className="flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
          />
        ) : (
          <LayoutTemplate size={16} />
        )}
      </div>
      <span className="truncate text-sm font-semibold">{data.label}</span>
    </div>
  );
};
