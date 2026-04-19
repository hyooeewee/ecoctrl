import { IconEye, IconEyeOff, IconGripVertical } from "@tabler/icons-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

import { cn } from "~/lib/utils";
import { type BentoLayoutItem, useSettingsStore } from "~/store/settings";

export type { BentoLayoutItem } from "~/store/settings";
export { defaultBentoLayout } from "~/store/settings";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export interface BentoItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

// ─── Grid config ──────────────────────────────────────────────────────────────

const COLS = 16;
const ROWS = 8;
const GAP = 16;
const PAD = 8;

const GRID_STYLE = {
  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
  gridTemplateRows: `repeat(${ROWS}, 1fr)`,
  gap: `${GAP}px`,
  padding: `${PAD}px`,
} as const;

// ─── Drag / drop types ────────────────────────────────────────────────────────

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  ghostW: number;
  ghostH: number;
  itemW: number; // grid units
  itemH: number; // grid units
}

// Two outcomes: swap positions with another widget, or move to an empty cell.
type DropResult =
  | { type: "swap"; targetId: string; snapX: number; snapY: number }
  | { type: "move"; snapX: number; snapY: number }
  | null;

// ─── Drag context ─────────────────────────────────────────────────────────────

interface DragCtx {
  draggingId: string | null;
  dropResult: DropResult;
  startDrag: (state: DragState, cardEl: HTMLElement) => void;
}

const DragContext = createContext<DragCtx>({
  draggingId: null,
  dropResult: null,
  startDrag: () => {},
});

// ─── BentoGrid ────────────────────────────────────────────────────────────────

export function BentoGrid({ children, className }: BentoGridProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropResult, setDropResult] = useState<DropResult>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dragEnabled = useSettingsStore((s) => s.bentoDragEnabled);
  const bentoLayout = useSettingsStore((s) => s.bentoLayout);
  const swapBentoItems = useSettingsStore((s) => s.swapBentoItems);
  const moveBentoItem = useSettingsStore((s) => s.moveBentoItem);

  // Clone the card as a fixed-position ghost and begin drag state.
  const startDrag = useCallback((state: DragState, cardEl: HTMLElement) => {
    const r = cardEl.getBoundingClientRect();
    const ghost = cardEl.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("data-bento-id");
    ghost.style.cssText = [
      `position:fixed`,
      `left:${r.left}px`,
      `top:${r.top}px`,
      `width:${r.width}px`,
      `height:${r.height}px`,
      `margin:0`,
      `z-index:9999`,
      `pointer-events:none`,
      `opacity:0.9`,
      `transform:scale(1.04)`,
      `box-shadow:0 24px 60px rgba(0,0,0,0.7)`,
      `border-radius:12px`,
      `transition:none`,
      `overflow:hidden`,
    ].join(";");
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
    setDrag(state);
    setDropResult(null);
  }, []);

  // Snap the ghost center to the nearest grid cell and determine swap vs. move.
  const computeDropResult = useCallback(
    (ghostLeft: number, ghostTop: number, ds: DragState): DropResult => {
      const gridEl = gridRef.current;
      if (!gridEl) return null;

      const gr = gridEl.getBoundingClientRect();

      // Bail if ghost doesn't overlap the grid at all
      if (
        ghostLeft + ds.ghostW < gr.left ||
        ghostLeft > gr.right ||
        ghostTop + ds.ghostH < gr.top ||
        ghostTop > gr.bottom
      ) {
        return null;
      }

      const cellW = (gr.width - 2 * PAD - (COLS - 1) * GAP) / COLS;
      const cellH = (gr.height - 2 * PAD - (ROWS - 1) * GAP) / ROWS;

      // Ghost top-left relative to the grid's content area (inside padding)
      const cx = ghostLeft - gr.left - PAD;
      const cy = ghostTop - gr.top - PAD;

      // Snap to 1-based column/row, clamped so the widget stays fully inside the grid
      const snapX = Math.max(1, Math.min(COLS - ds.itemW + 1, Math.floor(cx / (cellW + GAP)) + 1));
      const snapY = Math.max(1, Math.min(ROWS - ds.itemH + 1, Math.floor(cy / (cellH + GAP)) + 1));

      // Find any other visible widget whose grid rect overlaps the snap target
      const hit = bentoLayout.find(
        (item) =>
          item.id !== ds.id &&
          !item.hidden &&
          item.x < snapX + ds.itemW &&
          item.x + item.w > snapX &&
          item.y < snapY + ds.itemH &&
          item.y + item.h > snapY,
      );

      if (hit) return { type: "swap", targetId: hit.id, snapX, snapY };
      return { type: "move", snapX, snapY };
    },
    [bentoLayout],
  );

  // Move ghost and recompute drop target on every pointer move over the overlay.
  const handleOverlayMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag || !ghostRef.current) return;
      const ghostLeft = e.clientX - drag.offsetX;
      const ghostTop = e.clientY - drag.offsetY;
      ghostRef.current.style.left = `${ghostLeft}px`;
      ghostRef.current.style.top = `${ghostTop}px`;

      const result = computeDropResult(ghostLeft, ghostTop, drag);

      // Avoid re-renders when result is structurally identical
      setDropResult((prev) => {
        if (!result && !prev) return prev;
        if (!result || !prev) return result;
        if (result.type !== prev.type) return result;
        if (result.type === "swap" && prev.type === "swap") {
          return result.targetId !== prev.targetId ||
            result.snapX !== prev.snapX ||
            result.snapY !== prev.snapY
            ? result
            : prev;
        }
        if (result.type === "move" && prev.type === "move") {
          return result.snapX !== prev.snapX || result.snapY !== prev.snapY ? result : prev;
        }
        return result;
      });
    },
    [drag, computeDropResult],
  );

  // Commit or cancel the drag.
  const endDrag = useCallback(
    (commit: boolean) => {
      if (!drag) return;
      if (commit && dropResult) {
        if (dropResult.type === "swap") {
          swapBentoItems(drag.id, dropResult.targetId);
        } else {
          moveBentoItem(drag.id, dropResult.snapX, dropResult.snapY);
        }
      }
      ghostRef.current?.remove();
      ghostRef.current = null;
      setDrag(null);
      setDropResult(null);
    },
    [drag, dropResult, swapBentoItems, moveBentoItem],
  );

  return (
    <DragContext.Provider value={{ draggingId: drag?.id ?? null, dropResult, startDrag }}>
      <div className={cn("relative h-full w-full", className)}>
        {/*
         * Full-screen overlay — rendered only while dragging.
         * z-[9998]: above the grid (z-10) but below the ghost (z-[9999]).
         * Covering the full viewport means onPointerMove/Up always fire,
         * regardless of what's underneath the cursor.
         */}
        {drag && (
          <div
            className="fixed inset-0 z-[9998] cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerMove={handleOverlayMove}
            onPointerUp={() => endDrag(true)}
            onPointerCancel={() => endDrag(false)}
          />
        )}

        {/* Background grid guide cells — visible only in edit mode */}
        {dragEnabled && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
            style={{ display: "grid", ...GRID_STYLE }}
          >
            {Array.from({ length: COLS * ROWS }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl"
                style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        )}

        {/* Bento grid */}
        <div
          ref={gridRef}
          className="relative z-10 h-full w-full"
          style={{ display: "grid", ...GRID_STYLE }}
        >
          {children}

          {/* Snap preview — sits inside the CSS grid so it uses grid placement */}
          {drag && dropResult && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none z-20 rounded-xl border-2 border-dashed transition-none",
                dropResult.type === "swap"
                  ? "border-cyber-cyan/60 bg-cyber-cyan/5"
                  : "border-cyber-cyan/40 bg-white/[0.03]",
              )}
              style={{
                gridColumn: `${dropResult.snapX} / span ${drag.itemW}`,
                gridRow: `${dropResult.snapY} / span ${drag.itemH}`,
              }}
            />
          )}
        </div>
      </div>
    </DragContext.Provider>
  );
}

// ─── BentoItem ────────────────────────────────────────────────────────────────

export function BentoItem({ id, children, className }: BentoItemProps) {
  const bentoLayout = useSettingsStore((s) => s.bentoLayout);
  const dragEnabled = useSettingsStore((s) => s.bentoDragEnabled);
  const setBentoItemHidden = useSettingsStore((s) => s.setBentoItemHidden);
  const { draggingId, dropResult, startDrag } = useContext(DragContext);

  const item = bentoLayout.find((l) => l.id === id);
  const isBeingDragged = draggingId === id;
  const isSwapTarget = dropResult?.type === "swap" && dropResult.targetId === id;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!dragEnabled || !item || item.hidden) return;
      e.stopPropagation();
      e.preventDefault();

      const cardEl = (e.currentTarget as HTMLElement).closest("[data-bento-id]") as HTMLElement | null;
      if (!cardEl) return;

      const r = cardEl.getBoundingClientRect();
      startDrag(
        {
          id,
          offsetX: e.clientX - r.left,
          offsetY: e.clientY - r.top,
          ghostW: r.width,
          ghostH: r.height,
          itemW: item.w,
          itemH: item.h,
        },
        cardEl,
      );
    },
    [dragEnabled, id, item, startDrag],
  );

  if (!item) return null;
  if (item.hidden && !dragEnabled) return null;

  const isHidden = item.hidden;

  return (
    <div
      data-bento-id={id}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        "group relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-200",
        dragEnabled && !isBeingDragged && !isHidden && "cursor-move select-none touch-none",
        isBeingDragged
          ? "border-cyber-cyan/30 border-dashed bg-white/[0.02] opacity-20"
          : isHidden
            ? "border-white/5 bg-white/[0.02] opacity-50"
            : "border-white/10 bg-white/[0.04]",
        isSwapTarget && "ring-cyber-cyan/60 ring-4",
        className,
      )}
      style={{
        gridColumn: `${item.x} / span ${item.w}`,
        gridRow: `${item.y} / span ${item.h}`,
        pointerEvents: isBeingDragged ? "none" : undefined,
      }}
    >
      {/* Drag handle */}
      {dragEnabled && !isBeingDragged && !isHidden && (
        <div
          className="absolute top-1 left-1 z-20 flex cursor-grab items-center gap-1 rounded-md bg-black/60 px-2 py-1 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
        >
          <IconGripVertical size={14} className="text-muted-foreground" />
        </div>
      )}

      {/* Visibility toggle */}
      {dragEnabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setBentoItemHidden(id, !isHidden);
          }}
          className="absolute top-1.5 right-1.5 z-20 rounded-md bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
        >
          {isHidden ? (
            <IconEye size={12} className="text-muted-foreground" />
          ) : (
            <IconEyeOff size={12} className="text-muted-foreground" />
          )}
        </button>
      )}

      {isHidden ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase opacity-40">
            Hidden
          </span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
