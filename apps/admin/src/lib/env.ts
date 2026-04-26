/**
 * Centralized environment variable access for the admin app.
 *
 * Reads Vite-injected env variables with sensible defaults.
 * Warns in development when a required variable is missing.
 */

function getEnv(key: string, defaultValue: string, required = false): string {
  const value = (import.meta.env[key] as string | undefined) || "";
  if (!value) {
    if (required && import.meta.env.DEV) {
      console.warn(`[env] ${key} is not set, falling back to "${defaultValue}"`);
    }
    return defaultValue;
  }
  return value;
}

/** Backend base URL (no trailing slash). */
export const API_BASE_URL = getEnv("VITE_API_BASE_URL", "http://localhost:3000", true);

/** API route prefix (e.g. "/api"). */
export const API_PREFIX = getEnv("VITE_API_PREFIX", "/api");
