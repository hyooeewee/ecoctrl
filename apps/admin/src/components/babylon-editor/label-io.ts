// ========================================
// Label Import/Export Utilities
// ========================================

import { DashboardModelLabelSchema, type DashboardModelLabel } from "@ecoctrl/shared";

// ========================================
// Export
// ========================================

export interface LabelExportFile {
  version: "1.0";
  exportedAt: string;
  labels: DashboardModelLabel[];
}

export function buildExportPayload(labels: DashboardModelLabel[]): LabelExportFile {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    labels,
  };
}

export function downloadJson(payload: LabelExportFile, filename: string) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ========================================
// Import
// ========================================

export type ConflictResolution = "overwrite" | "skip" | "rename";

export interface ImportLabel extends DashboardModelLabel {
  /** Conflict status relative to existing labels */
  conflictStatus: "new" | "conflict";
  /** User-chosen resolution (only for conflicts) */
  resolution: ConflictResolution;
  /** Resolved ID after rename (if applicable) */
  resolvedId?: string;
}

/**
 * Parse and validate an imported JSON file.
 * Returns parsed labels or throws with a descriptive error.
 */
export function parseImportFile(raw: string): DashboardModelLabel[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("文件不是有效的 JSON 格式");
  }

  // Support both wrapped format and raw array
  let labels: unknown[];
  if (Array.isArray(data)) {
    labels = data;
  } else if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).labels)
  ) {
    labels = (data as { labels: unknown[] }).labels;
  } else {
    throw new Error("JSON 中未找到标签数组（期望顶层数组或 { labels: [...] }）");
  }

  const result: DashboardModelLabel[] = [];
  const errors: string[] = [];

  for (let i = 0; i < labels.length; i++) {
    const parsed = DashboardModelLabelSchema.safeParse(labels[i]);
    if (parsed.success) {
      result.push(parsed.data);
    } else {
      errors.push(`标签 #${i + 1}: ${parsed.error.issues.map((e) => e.message).join(", ")}`);
    }
  }

  if (errors.length > 0 && result.length === 0) {
    throw new Error(`所有标签验证失败:\n${errors.join("\n")}`);
  }

  return result;
}

/**
 * Detect conflicts between imported labels and existing labels.
 */
export function detectConflicts(
  imported: DashboardModelLabel[],
  existing: DashboardModelLabel[],
): ImportLabel[] {
  const existingIds = new Set(existing.map((l) => l.meta.id));

  return imported.map((label) => ({
    ...label,
    conflictStatus: existingIds.has(label.meta.id) ? ("conflict" as const) : ("new" as const),
    resolution: existingIds.has(label.meta.id) ? ("rename" as const) : ("overwrite" as const),
  }));
}

/**
 * Resolve a renamed ID to avoid conflicts.
 */
export function resolveRenamedId(originalId: string, existingIds: Set<string>): string {
  let candidate = `${originalId}-imported`;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${originalId}-imported-${suffix}`;
    suffix++;
  }
  return candidate;
}

/**
 * Apply import resolutions: rename IDs, update parentId references, update action labelIds.
 */
export function applyResolutions(labels: ImportLabel[]): DashboardModelLabel[] {
  // Build rename map
  const renameMap = new Map<string, string>();
  const finalIds = new Set<string>();

  for (const label of labels) {
    if (label.resolution === "skip") continue;

    if (label.resolution === "rename" || label.conflictStatus === "conflict") {
      const newId = resolveRenamedId(label.meta.id, finalIds);
      renameMap.set(label.meta.id, newId);
      finalIds.add(newId);
    } else {
      finalIds.add(label.meta.id);
    }
  }

  // Apply renames
  return labels
    .filter((l) => l.resolution !== "skip")
    .map((label) => {
      const newId = renameMap.get(label.meta.id) ?? label.meta.id;

      // Update parentId reference
      const parentId =
        label.tree.parentId && renameMap.has(label.tree.parentId)
          ? renameMap.get(label.tree.parentId)!
          : label.tree.parentId;

      // Update action labelIds references
      const actions = label.actions.map((action) => {
        if (action.type === "label" && action.config && typeof action.config === "object") {
          const cfg = action.config as { labelIds?: string[] };
          if (cfg.labelIds) {
            return {
              ...action,
              config: {
                ...cfg,
                labelIds: cfg.labelIds.map((id) => renameMap.get(id) ?? id),
              },
            };
          }
        }
        return action;
      });

      return {
        ...label,
        meta: { ...label.meta, id: newId },
        tree: { ...label.tree, parentId },
        actions,
      };
    });
}
