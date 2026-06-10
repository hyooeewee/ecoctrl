// ========================================
// Shared BabylonJS Utilities
// ========================================

export { createEngine, createScene } from "./engine";
export { loadGltf, type LoadGltfOptions, type LoadGltfResult } from "./loader";
export { loadModelsByPriority, type PriorityLoadOptions } from "./orchestrator";
export { createGlowLayer } from "./glow";

// TODO: extract label system → "./labels"
// TODO: extract environment setup → "./environment"
// TODO: extract action system → "./actions"
