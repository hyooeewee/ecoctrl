// ========================================
// Viewport Controls
// ========================================

import React from "react";
import { ZoomIn, ZoomOut, Home, Grid3X3, Axis3D } from "lucide-react";
import { Button } from "@ecoctrl/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ecoctrl/ui";

import type { BabylonSceneRef } from "@/components/babylon-editor";

interface ViewportControlsProps {
  sceneRef: React.RefObject<BabylonSceneRef | null>;
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
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
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => sceneRef.current?.zoomIn?.()}
            >
              <ZoomIn size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">放大</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => sceneRef.current?.zoomOut?.()}
            >
              <ZoomOut size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">缩小</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-auto h-px w-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => sceneRef.current?.resetView?.()}
            >
              <Home size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">还原视角</TooltipContent>
        </Tooltip>

        <div className="bg-border mx-auto h-px w-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleGrid}
            >
              <Grid3X3 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{showGrid ? "隐藏网格" : "显示网格"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAxes ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleAxes}
            >
              <Axis3D size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{showAxes ? "隐藏坐标轴" : "显示坐标轴"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
