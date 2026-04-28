import React, { useRef, useState } from "react";
import { File, Upload, X } from "lucide-react";
import { Button } from "@ecoctrl/ui";

interface ExistingFileInfo {
  name: string;
  size: string;
  format: string;
}

interface ModelFileZoneProps {
  file: File | null;
  existingInfo?: ExistingFileInfo | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  onDeleteExisting?: () => void;
  acceptedFormats?: string;
}

const FORMAT_MAP: Record<string, string> = {
  glb: "GLB",
  gltf: "GLTF",
  zip: "GLTF (zip)",
  obj: "OBJ",
  fbx: "FBX",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export default function ModelFileZone({
  file,
  existingInfo,
  onFileSelect,
  onFileClear,
  onDeleteExisting,
  acceptedFormats = ".glb,.gltf,.zip,.obj,.fbx",
}: ModelFileZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClickClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileClear();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClickDeleteExisting = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteExisting?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
        dragActive
          ? "border-blue-400 bg-blue-50/50"
          : "border-border bg-muted hover:border-muted-foreground/50"
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {file ? (
        <div className="flex items-center gap-3">
          <File size={32} className="text-blue-500" />
          <div className="text-left">
            <p className="max-w-[200px] break-all text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} /{" "}
              {FORMAT_MAP[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? "Unknown"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="ml-2 h-7 w-7" onClick={handleClickClear}>
            <X size={14} />
          </Button>
        </div>
      ) : existingInfo ? (
        <div className="flex items-center gap-3">
          <File size={32} className="text-blue-500" />
          <div className="text-left">
            <p className="max-w-[200px] break-all text-sm font-medium">{existingInfo.name}</p>
            <p className="text-xs text-muted-foreground">
              {existingInfo.size} / {existingInfo.format}
            </p>
          </div>
          <div className="ml-2 flex items-center gap-1">
            {onDeleteExisting && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                onClick={handleClickDeleteExisting}
                title="删除当前文件"
              >
                <X size={14} />
              </Button>
            )}
            <span className="text-xs text-muted-foreground">点击替换</span>
          </div>
        </div>
      ) : (
        <>
          <Upload size={32} className="text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium">点击或拖拽文件到此处</p>
          <p className="mt-1 text-xs text-muted-foreground">支持 {acceptedFormats}</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
    </div>
  );
}
