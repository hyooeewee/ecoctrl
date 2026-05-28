import { useState, useCallback, useRef, useEffect } from "react";

const PET_SIZE = 64;
const MARGIN = 16;
const DRAG_THRESHOLD = 5;

export function usePetPosition(initialX?: number, initialY?: number) {
  const [position, setPosition] = useState({
    x: initialX ?? 400,
    y: initialY ?? 500,
  });

  useEffect(() => {
    setPosition({
      x: initialX ?? window.innerWidth - PET_SIZE - MARGIN,
      y: initialY ?? window.innerHeight - PET_SIZE - MARGIN,
    });
  }, [initialX, initialY]);
  const positionRef = useRef(position);
  // Keep ref in sync with state for event handlers
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState<"left" | "right" | null>(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setIsDragging(true);
    setDragDirection(null);
    // Read latest position from ref to avoid stale closure
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!hasDraggedRef.current) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < DRAG_THRESHOLD) return;
      hasDraggedRef.current = true;
    }

    if (dx !== 0) {
      setDragDirection(dx > 0 ? "right" : "left");
    }

    const maxX = (typeof window !== "undefined" ? window.innerWidth : 800) - PET_SIZE - MARGIN;
    const maxY = (typeof window !== "undefined" ? window.innerHeight : 600) - PET_SIZE - MARGIN;

    setPosition({
      x: Math.max(MARGIN, Math.min(maxX, dragStartRef.current.posX + dx)),
      y: Math.max(MARGIN, Math.min(maxY, dragStartRef.current.posY + dy)),
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragDirection(null);
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    position,
    isDragging,
    hasDraggedRef,
    dragDirection,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
