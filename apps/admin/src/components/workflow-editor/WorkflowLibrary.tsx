import { Search, X, ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";
import { Input } from "@ecoctrl/ui/input";
import type { ComponentCategory } from "./constants";

interface WorkflowLibraryProps {
  libraryOpen: boolean;
  searchQuery: string;
  collapsedCategories: Set<string>;
  filteredCategories: ComponentCategory[];
  onLibraryToggle: () => void;
  onSearchChange: (v: string) => void;
  onCategoryToggle: (id: string) => void;
  onDragStart: (e: React.DragEvent, type: string) => void;
  onDragEnd: () => void;
}

export function WorkflowLibrary({
  libraryOpen,
  searchQuery,
  collapsedCategories,
  filteredCategories,
  onLibraryToggle,
  onSearchChange,
  onCategoryToggle,
  onDragStart,
  onDragEnd,
}: WorkflowLibraryProps) {
  return (
    <div className="relative flex">
      <div
        className={`flex flex-col overflow-hidden border-r bg-zinc-50 transition-all duration-200 dark:bg-zinc-950 ${libraryOpen ? "w-[260px]" : "w-0 border-r-0"}`}
      >
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">节点库</h3>
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
                    category.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, item.type)}
                          onDragEnd={onDragEnd}
                          className="flex cursor-grab items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 active:cursor-grabbing"
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${item.colorClass}`}
                          >
                            <Icon size={14} />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium">{item.label}</span>
                            <span className="text-muted-foreground truncate text-[10px]">
                              {item.description}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onLibraryToggle}
        className={`absolute top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm transition-all duration-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 ${libraryOpen ? "left-[252px]" : "left-0"}`}
        title={libraryOpen ? "收起节点库" : "展开节点库"}
      >
        {libraryOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </div>
  );
}
