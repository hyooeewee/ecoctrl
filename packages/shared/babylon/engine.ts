// ========================================
// Engine / Scene Bootstrap
// ========================================

import { Engine, Scene } from "@babylonjs/core";

export interface EngineOptions {
  preserveDrawingBuffer?: boolean;
  stencil?: boolean;
  antialias?: boolean;
}

/**
 * Create a WebGL engine with sensible defaults for model viewing.
 */
export function createEngine(canvas: HTMLCanvasElement, options: EngineOptions = {}): Engine {
  return new Engine(canvas, true, {
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
    stencil: options.stencil ?? true,
    antialias: options.antialias ?? true,
  });
}

/**
 * Create a new Scene attached to the given engine.
 */
export function createScene(engine: Engine): Scene {
  return new Scene(engine);
}
