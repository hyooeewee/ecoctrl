import { useState, useCallback, useRef } from "react";

const PET_SIZE = 64;
const MARGIN = 16;

export function usePetPosition(initialX?: number, initialY?: number) {
  const [position, setPosition] = useState({
    x: initialX ?? (typeof window !== "undefined" ? window.innerWidth - PET_SIZE - MARGIN : 400),
    y: initialY ?? (typeof window !== "undefined" ? window.innerHeight - PET_SIZE - MARGIN : 500),
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      const maxX = (typeof window !== "undefined" ? window.innerWidth : 800) - PET_SIZE - MARGIN;
      const maxY = (typeof window !== "undefined" ? window.innerHeight : 600) - PET_SIZE - MARGIN;

      setPosition({
        x: Math.max(MARGIN, Math.min(maxX, dragStartRef.current.posX + dx)),
        y: Math.max(MARGIN, Math.min(maxY, dragStartRef.current.posY + dy)),
      });
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    position,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
