// ========================================
// Label System — TODO
// ========================================
//
// Shared label infrastructure for both admin editor and web dashboard.
//
// Currently duplicated across:
//   - apps/web/app/components/dashboard/model-viewer/ModelViewer.ts
//     (lines ~558–600: anchor computation, ~808–835: 2D projection)
//   - apps/admin/src/components/babylon-editor/LabelMarker.tsx
//     (label markers in 3D scene)
//   - apps/admin/src/components/babylon-editor/LabelTree.tsx
//     (label hierarchy UI)
//
// What to extract here:
//   1. Label anchor computation from mesh keywords + fallback positions
//   2. 3D-to-2D screen projection for React overlay pills
//   3. Label-to-mesh group mapping (which label belongs to which model group)
//   4. Shared types for LabelConfig, LabelAnchor, etc.
//
// Blockers before extraction:
//   - Web uses V2 labels with operations (camera, clipping, visibility, postprocess)
//   - Admin uses simpler label placement (position + meshKeywords)
//   - Need to reconcile the two label schemas into a unified type
//
