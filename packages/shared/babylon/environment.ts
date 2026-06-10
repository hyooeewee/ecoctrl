// ========================================
// Environment Setup — TODO
// ========================================
//
// Shared scene environment configuration for both admin and web.
//
// Currently duplicated across:
//   - apps/web/app/components/dashboard/model-viewer/ModelViewer.ts
//     (lines ~122–135: createDefaultEnvironment with skybox, ground, image processing)
//   - apps/admin/src/components/babylon-editor/BabylonScene.tsx
//     (has no environment setup; only ambientColor + basic lights)
//
// What to extract here:
//   1. createDefaultEnvironment wrapper with configurable options
//   2. Skybox + ground setup
//   3. Image processing (tone mapping, exposure, contrast)
//   4. Ambient color / hemispheric light defaults
//
// Design considerations:
//   - Admin sets environment config; web reads and applies it
//   - Should accept a config object rather than hard-coded defaults
//   - Web's DEFAULT_ENVIRONMENT constants should live here
//
