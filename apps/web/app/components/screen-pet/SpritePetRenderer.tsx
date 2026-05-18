import { useEffect, useMemo, useRef, useState } from "react";
import { usePets } from "./hooks/usePets";

export type SpritePetState =
  | "idle"
  | "runRight"
  | "runLeft"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

interface SpritePetRendererProps {
  petId: string;
  state?: SpritePetState;
  fps?: number;
  scale?: number;
}

const STATE_MAP: Record<SpritePetState, number> = {
  idle: 0,
  runRight: 1,
  runLeft: 2,
  waving: 3,
  jumping: 4,
  failed: 5,
  waiting: 6,
  running: 7,
  review: 8,
};

// Codex-pets format: fixed frame count per row for all pets
const FRAME_COUNTS = [6, 8, 8, 4, 5, 7, 5, 8, 5];

// Default sprite sheet dimensions for built-in pets
const DEFAULT_COLS = 8;
const DEFAULT_ROWS = 9;
const DEFAULT_CELL_WIDTH = 192;
const DEFAULT_CELL_HEIGHT = 208;

export function SpritePetRenderer({
  petId,
  state = "idle",
  fps = 8,
  scale = 1,
}: SpritePetRendererProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { pets } = usePets();

  const pet = useMemo(() => {
    return pets.find((p) => p.id === petId);
  }, [pets, petId]);

  const row = STATE_MAP[state] ?? 0;

  useEffect(() => {
    if (!pet) return;

    setFrameIndex(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const frameCount = FRAME_COUNTS[row] ?? DEFAULT_COLS;
    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameCount);
    }, 1000 / fps);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pet, row, fps]);

  if (!pet) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-500"
        style={{ width: 96, height: 104 }}
      >
        ?
      </div>
    );
  }

  const cols = DEFAULT_COLS;
  const rows = DEFAULT_ROWS;
  const cellWidth = DEFAULT_CELL_WIDTH;
  const cellHeight = DEFAULT_CELL_HEIGHT;
  const bgWidth = cols * cellWidth * scale;
  const bgHeight = rows * cellHeight * scale;
  const offsetX = frameIndex * cellWidth * scale;
  const offsetY = row * cellHeight * scale;

  return (
    <div
      className="inline-block"
      style={{
        width: cellWidth * scale,
        height: cellHeight * scale,
        backgroundImage: `url(${pet.spritesheetUrl})`,
        backgroundPosition: `-${offsetX}px -${offsetY}px`,
        backgroundSize: `${bgWidth}px ${bgHeight}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
}
