import { useRef, useState, useCallback } from "react";
import { Search, X, ChevronRight, ChevronDown, LayoutTemplate, Upload } from "lucide-react";
import { Input } from "@ecoctrl/ui/input";
import type { ComponentCategory } from "./types";

interface WorkflowLibraryProps {
  libraryOpen: boolean;
  searchQuery: string;
  collapsedCategories: Set<string>;
  filteredCategories: ComponentCategory[];
  onSearchChange: (v: string) => void;
  onCategoryToggle: (id: string) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
  onDragEnd: () => void;
  onUpload: (file: File) => void;
  uploading?: boolean;
}

export function WorkflowLibrary({
  libraryOpen,
  searchQuery,
  collapsedCategories,
  filteredCategories,
  onSearchChange,
  onCategoryToggle,
  onDragStart,
  onDragEnd,
  onUpload,
  uploading,
}: WorkflowLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resizable panel width
  const [panelWidth, setPanelWidth] = useState(260);
  const isDraggingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!libraryOpen) return;
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = panelWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = Math.min(600, Math.max(180, startWidth + delta));
        setPanelWidth(next);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [panelWidth, libraryOpen],
  );

  return (
    <div className="relative flex">
      <div
        className={`flex flex-col overflow-hidden border-r bg-zinc-50 transition-all duration-200 dark:bg-zinc-950 ${libraryOpen ? "" : "w-0 border-r-0"}`}
        style={libraryOpen ? { width: panelWidth } : undefined}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">节点库</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ecn"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="上传节点包"
          >
            <Upload size={14} />
          </button>
        </div>
        <div className="px-3 py-2">
          <div className="relative">
            <Search
              size={14}
              className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <Input
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <button
                className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 hover:text-foreground"
                onClick={() => onSearchChange("")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 px-2 pb-4">
            {filteredCategories.map((category) => {
              const isCollapsed = collapsedCategories.has(category.id);
              return (
                <div key={category.id}>
                  <button
                    type="button"
                    onClick={() => onCategoryToggle(category.id)}
                    className="flex w-full items-center gap-1 px-2 py-1.5"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={12} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={12} className="text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      {category.label}
                    </span>
                  </button>
                  {!isCollapsed &&
                    category.items.map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item.type)}
                        onDragEnd={onDragEnd}
                        className="flex cursor-grab items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 active:cursor-grabbing"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                          style={{
                            backgroundColor: (item.color ?? "#94a3b8") + "26",
                            color: item.color ?? "#94a3b8",
                          }}
                        >
                          {item.iconSvg ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: item.iconSvg }}
                              className="flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                            />
                          ) : (
                            <LayoutTemplate size={14} />
                          )}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-medium">{item.label}</span>
                          <span className="text-muted-foreground truncate text-[10px]">
                            {item.description}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="text-muted-foreground px-2 py-4 text-center text-xs">
                未找到匹配的节点
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize handle */}
      {libraryOpen && (
        <div
          className="absolute right-0 top-0 bottom-0 z-50 w-3 cursor-col-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors hover:bg-primary/40" />
        </div>
      )}
    </div>
  );
}
