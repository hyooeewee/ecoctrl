import { RotateCcw, Maximize2, AlertTriangle, Download } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import AppButton from "@/components/AppButton";

interface ModelViewerProps {
  src: string | null;
  alt?: string;
  format: string | null;
}

const PREVIEWABLE_FORMATS = new Set(["GLB", "GLTF", "GLTF (zip)"]);

export default function ModelViewer({ src, alt, format }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const canPreview = PREVIEWABLE_FORMATS.has((format ?? "").toUpperCase());

  // Lazy load model-viewer web component
  useEffect(() => {
    if (!canPreview) return;

    let cancelled = false;

    const load = async () => {
      try {
        await import("@google/model-viewer");
      } catch {
        if (!cancelled) setHasError(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [canPreview]);

  // Bind native events on the web component via ref
  useEffect(() => {
    if (!canPreview || hasError || !src) return;

    const el = viewerRef.current;
    if (!el) return;

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    el.addEventListener("load", handleLoad);
    el.addEventListener("error", handleError);

    return () => {
      el.removeEventListener("load", handleLoad);
      el.removeEventListener("error", handleError);
    };
  }, [canPreview, hasError, src]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    const mv = viewerRef.current as any;
    if (mv) {
      mv.cameraOrbit = "0deg 75deg 105%";
      mv.fieldOfView = "30deg";
    }
  };

  if (!canPreview) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted">
        <AlertTriangle size={48} className="text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">该格式暂不支持在线预览</p>
          <p className="mt-1 text-xs text-muted-foreground">
            格式: {format}（仅 GLB/GLTF 支持3D预览）
          </p>
        </div>
        {src && (
          <a
            href={src}
            download
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download size={16} />
            下载模型文件
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-black"
    >
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <AppButton
          level="ghost"
          size="icon-sm"
          className="h-8 w-8 border bg-background/80 backdrop-blur-sm"
          onClick={handleReset}
          title="重置视角"
        >
          <RotateCcw size={14} />
        </AppButton>
        <AppButton
          level="ghost"
          size="icon-sm"
          className="h-8 w-8 border bg-background/80 backdrop-blur-sm"
          onClick={toggleFullscreen}
          title="全屏"
        >
          <Maximize2 size={14} />
        </AppButton>
      </div>

      {/* Model viewer */}
      {hasError ? (
        <div className="flex flex-1 items-center justify-center text-sm text-red-400">
          模型加载失败，请检查文件是否有效
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {src && (
            <model-viewer
              ref={viewerRef as any}
              src={src}
              alt={alt || "3D Model"}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              exposure="1"
              interaction-prompt="none"
              camera-orbit="0deg 75deg 105%"
              field-of-view="30deg"
              loading="eager"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "transparent",
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
