// ========================================
// Viewport Controls
// ========================================

import { ZoomIn, ZoomOut, Home, Grid3X3, Axis3D } from "lucide-react";
import { buttonVariants } from "@ecoctrl/ui/button";
import { cn } from "@ecoctrl/ui/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ecoctrl/ui";

import type { BabylonSceneRef } from "@/components/babylon-editor";

interface ViewportControlsProps {
  sceneRef: React.RefObject<BabylonSceneRef | null>;
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
}

function controlClass(variant: "ghost" | "secondary"): string {
  return cn(buttonVariants({ variant, size: "icon" }), "h-8 w-8");
}

export default function ViewportControls({
  sceneRef,
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
}: ViewportControlsProps) {
  return (
    <TooltipProvider>
      <div className="bg-card/80 backdrop-blur border-border absolute right-6 bottom-6 z-10 flex flex-col gap-0.5 rounded-lg border p-1 shadow-lg">
        <Tooltip>
          <TooltipTrigger onClick={() => sceneRef.current?.zoomIn?.()}>
            <span className={controlClass("ghost")}>
              <ZoomIn size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">放大</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger onClick={() => sceneRef.current?.zoomOut?.()}>
            <span className={controlClass("ghost")}>
              <ZoomOut size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">缩小</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-auto h-px w-5" />

        <Tooltip>
          <TooltipTrigger onClick={() => sceneRef.current?.resetView?.()}>
            <span className={controlClass("ghost")}>
              <Home size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">还原视角</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-auto h-px w-5" />

        <Tooltip>
          <TooltipTrigger onClick={onToggleGrid}>
            <span className={controlClass(showGrid ? "secondary" : "ghost")}>
              <Grid3X3 size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{showGrid ? "隐藏网格" : "显示网格"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger onClick={onToggleAxes}>
            <span className={controlClass(showAxes ? "secondary" : "ghost")}>
              <Axis3D size={16} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">{showAxes ? "隐藏坐标轴" : "显示坐标轴"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
