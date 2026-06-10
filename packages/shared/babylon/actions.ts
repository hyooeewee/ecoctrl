// ========================================
// Action System — TODO
// ========================================
//
// Shared action/operation execution system (formerly "clipping").
// Actions are configured in admin and executed in web dashboard.
//
// Currently duplicated across:
//   - apps/web/app/components/dashboard/model-viewer/ModelViewer.ts
//     (lines ~697–754: executeOperation with camera/clipping/visibility/postprocess)
//   - apps/admin/src/pages/DashboardModel.tsx
//     (editorMode === "clipPreview" — action configuration tab)
//   - apps/admin/src/components/babylon-editor/hooks/useClippingPreview.ts
//     (clipping plane preview logic)
//
// Action types to support:
//   1. camera   — animate camera to target position
//   2. clipping — animate Y-axis clip plane
//   3. visibility — show/hide/toggle model groups
//   4. postprocess — glow intensity, etc.
//
// What to extract here:
//   1. Operation type definitions (discriminated union)
//   2. Operation validation / schema
//   3. Operation execution engine (accepts scene + camera + state, applies operation)
//   4. Clipping plane state management (currentY, targetY, lobbyTop detection)
//
// Naming note:
//   Using "actions" instead of "clipping" because the system handles
//   camera moves, visibility toggles, and post-processing — not just clipping.
//
