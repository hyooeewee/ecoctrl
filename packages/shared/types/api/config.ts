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

export const LabelOperationSchema = z.discriminatedUnion("type", [
  CameraOperationSchema,
  ClippingOperationSchema,
  VisibilityOperationSchema,
  PostProcessOperationSchema,
]);
export type LabelOperation = z.infer<typeof LabelOperationSchema>;

// ========================================
// Label Group Schema
// ========================================
export const LabelGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  pointIds: z.array(z.string()).default([]),
});
export type LabelGroup = z.infer<typeof LabelGroupSchema>;

// ========================================
// Label Schema (Tags with optional 3D position)
// ========================================

export const DashboardModelLabelSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  meshKeywords: z.array(z.string()).default([]),
  operations: z.array(LabelOperationSchema),
  order: z.number(),
  groups: z.array(LabelGroupSchema).default([]),
});
export type DashboardModelLabel = z.infer<typeof DashboardModelLabelSchema>;

// ========================================
// Model File Entry Schema
// ========================================

export const ModelFileEntrySchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  name: z.string().optional(),
  priority: z.enum(["critical", "background"]).default("background"),
  order: z.number().default(0),
  labels: z.array(DashboardModelLabelSchema).optional(),
});
export type ModelFileEntry = z.infer<typeof ModelFileEntrySchema>;

// ========================================
// Label Schema (Legacy - for backward compat)
// ========================================

export const LegacyDashboardModelLabelSchema = z.object({
  key: z.string(),
  fallbackPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  meshKeywords: z.array(z.string()),
  focusAlpha: z.number(),
  focusBeta: z.number(),
  focusRadius: z.number(),
});
export type LegacyDashboardModelLabel = z.infer<typeof LegacyDashboardModelLabelSchema>;

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
