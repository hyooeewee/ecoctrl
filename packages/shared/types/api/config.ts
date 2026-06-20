import { z } from "zod";

// ========================================
// Hotspot Schema
// ========================================

export const DashboardModelHotspotSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  meshKeywords: z.array(z.string()),
  radius: z.number(),
  description: z.string(),
});
export type DashboardModelHotspot = z.infer<typeof DashboardModelHotspotSchema>;

// ========================================
// Label Operation Schemas
// ========================================

export const CameraOperationSchema = z.object({
  type: z.literal("camera"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    target: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    distance: z.number(),
    fov: z.number(),
    duration: z.number(),
    easing: z.string().optional(),
  }),
});

export const ClippingOperationSchema = z.object({
  type: z.literal("clipping"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    planeNormal: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    planeOffset: z.number(),
    duration: z.number(),
    revealLabelIds: z.array(z.string()).optional(),
  }),
});

export const VisibilityOperationSchema = z.object({
  type: z.literal("visibility"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    targets: z.array(z.string()),
    action: z.enum(["show", "hide", "toggle"]),
    duration: z.number().optional(),
  }),
});

export const PostProcessOperationSchema = z.object({
  type: z.literal("postprocess"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    effect: z.string(),
    value: z.number(),
    duration: z.number().optional(),
  }),
});

export const HighlightOperationSchema = z.object({
  type: z.literal("highlight"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    targets: z.array(z.string()),
    mode: z.enum(["outline", "glow", "color"]),
    color: z
      .object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() })
      .optional(),
    duration: z.number().optional(),
  }),
});

export const ExplodeOperationSchema = z.object({
  type: z.literal("explode"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    axis: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    distance: z.number(),
    targets: z.array(z.string()).optional(),
    duration: z.number(),
    easing: z.string().optional(),
  }),
});

export const MaterialOperationSchema = z.object({
  type: z.literal("material"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    targets: z.array(z.string()),
    property: z.enum(["opacity", "emissive", "wireframe"]),
    value: z.union([z.number(), z.boolean()]),
    duration: z.number().optional(),
  }),
});

export const LabelControlOperationSchema = z.object({
  type: z.literal("label"),
  targetModelFileId: z.string().optional(),
  config: z.object({
    labelIds: z.array(z.string()),
    action: z.enum(["show", "hide", "toggle"]),
  }),
});

export const LabelOperationSchema = z.discriminatedUnion("type", [
  CameraOperationSchema,
  ClippingOperationSchema,
  VisibilityOperationSchema,
  PostProcessOperationSchema,
  HighlightOperationSchema,
  ExplodeOperationSchema,
  MaterialOperationSchema,
  LabelControlOperationSchema,
]);
export type LabelOperation = z.infer<typeof LabelOperationSchema>;

// ========================================
// Label v2 — Semantic Sub-objects
// ========================================

// Identity
export const LabelMetaSchema = z.object({
  id: z.string().describe("Unique identifier, e.g. 'south_lobby'"),
  name: z.string().describe("Display name, e.g. '南序厅'"),
  description: z.string().optional(),
});
export type LabelMeta = z.infer<typeof LabelMetaSchema>;

// 3D anchor
export const LabelAnchorSchema = z.object({
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  meshKeywords: z.array(z.string()).default([]),
});
export type LabelAnchor = z.infer<typeof LabelAnchorSchema>;

// Tree hierarchy
export const LabelTreeSchema = z.object({
  parentId: z.string().nullable().optional().describe("null/undefined = root"),
  order: z.number().default(0),
});
export type LabelTree = z.infer<typeof LabelTreeSchema>;

// Point groups
export const LabelGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  pointIds: z.array(z.string()).default([]),
});
export type LabelGroup = z.infer<typeof LabelGroupSchema>;

// Click actions
export const LabelActionSchema = z.object({
  id: z.string(),
  label: z.string().optional().describe("Human-readable action name"),
  type: z.enum([
    "camera",
    "clipping",
    "visibility",
    "postprocess",
    "highlight",
    "explode",
    "material",
    "label",
  ]),
  config: z.record(z.string(), z.unknown()).describe("Typed config matching action type"),
});
export type LabelAction = z.infer<typeof LabelActionSchema>;

// ========================================
// Label Schema v2
// ========================================

export const DashboardModelLabelSchema = z.object({
  meta: LabelMetaSchema,
  anchor: LabelAnchorSchema.default({ meshKeywords: [] }),
  tree: LabelTreeSchema.default({ order: 0 }),
  groups: z.array(LabelGroupSchema).default([]),
  actions: z.array(LabelActionSchema).default([]),
  modelBindings: z.array(z.string()).default([]).describe("Bound model roles; empty = global"),
});
export type DashboardModelLabel = z.infer<typeof DashboardModelLabelSchema>;

// ========================================
// Model File Entry Schema
// ========================================

export const ModelFileEntrySchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  name: z.string().optional(),
  role: z.string().optional().describe("Semantic role, e.g. 'building', 'furniture'"),
  priority: z.enum(["critical", "background"]).default("background"),
  order: z.number().default(0),
  labels: z.array(DashboardModelLabelSchema).optional(),
});
export type ModelFileEntry = z.infer<typeof ModelFileEntrySchema>;

// ========================================
// Config Schema
// ========================================

export const DashboardModelConfigSchema = z.object({
  modelFileUrl: z.string().nullable().optional(),
  // Multiple model files (same coordinate system)
  modelFiles: z.array(ModelFileEntrySchema).optional(),
  cameraPreset: z.string(),
  ambientLightIntensity: z.number(),
  hotspots: z.array(DashboardModelHotspotSchema),
  labels: z.array(DashboardModelLabelSchema),
});
export type DashboardModelConfig = z.infer<typeof DashboardModelConfigSchema>;

// ========================================
// System Config
// ========================================

export const SystemConfigSchema = z.object({
  platformName: z.string(),
  refreshInterval: z.number(),
  realtimeAlertEnabled: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string(),
  alertSound: z.boolean(),
  smtpHost: z.string(),
  smtpPort: z.number(),
  smtpUser: z.string(),
  smtpPass: z.string(),
  smtpSecure: z.boolean(),
  autoBackup: z.boolean(),
  backupRetentionDays: z.number(),
  sessionTimeout: z.number(),
  allowRegistration: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowOAuthLogin: z.boolean(),
});
export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const PublicSystemConfigSchema = z.object({
  platformName: z.string(),
  allowRegistration: z.boolean(),
  allowPasswordReset: z.boolean(),
  allowOAuthLogin: z.boolean(),
});
export type PublicSystemConfig = z.infer<typeof PublicSystemConfigSchema>;

export const BackupScheduleSchema = z.object({
  nextBackup: z.string(),
});
export type BackupSchedule = z.infer<typeof BackupScheduleSchema>;
