import type { WorkflowDSL } from "./types";

// ========================================
// Split DSL envVars into env vs secrets
// ========================================

export function splitEnvVars(dsl: WorkflowDSL): {
  env: Record<string, string>;
  secrets: Record<string, string>;
} {
  const env: Record<string, string> = {};
  const secrets: Record<string, string> = {};

  if (!dsl.envVars) return { env, secrets };

  for (const v of dsl.envVars) {
    const strValue = String(v.value ?? "");
    if (v.type === "secret") {
      secrets[v.key] = strValue;
    } else {
      env[v.key] = strValue;
    }
  }

  return { env, secrets };
}

// ========================================
// Merge server env with workflow env
// ========================================

export function mergeServerEnv(
  serverEnv: Record<string, string>,
  workflowEnv: Record<string, string>,
): Record<string, string> {
  return { ...serverEnv, ...workflowEnv };
}
