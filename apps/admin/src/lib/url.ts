/**
 * Resolve a server-side relative path (e.g. "/uploads/models/x.glb",
 * "/api/files/:id/preview") to an absolute URL using VITE_API_BASE_URL.
 *
 * Behaviour:
 * - Empty / null / undefined → returned as-is.
 * - Absolute URLs (http://, https://, blob:, data:) → returned as-is.
 * - Paths starting with "/" → prefixed with VITE_API_BASE_URL.
 * - Other strings → returned as-is.
 *
 * Use this for resources that the browser loads directly via <img>, <a>,
 * <model-viewer>, window.open(), etc., where the request would otherwise
 * be resolved against the admin site's origin.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export function resolveAssetUrl(path: string): string;
export function resolveAssetUrl(path: null): null;
export function resolveAssetUrl(path: undefined): undefined;
export function resolveAssetUrl(path: string | null | undefined): string | null | undefined;
export function resolveAssetUrl(path: string | null | undefined): string | null | undefined {
  if (path == null || path === "") return path;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return path;
}
