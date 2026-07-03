/**
 * Resolve a server-side relative path (e.g. "/static/models/x.glb",
 * "/api/files/:id/preview") for use in <img>, <a>, <model-viewer>,
 * window.open(), etc.
 *
 * Behaviour:
 * - Empty / null / undefined → returned as-is.
 * - Absolute URLs (http://, https://, blob:, data:) → returned as-is.
 * - Other strings (including paths starting with "/") → returned as-is.
 *
 * Same-origin paths like "/static/*" are proxied to the backend by the
 * front-end server (Caddy in production, Vite dev server in
 * development), so no host prefixing is needed.
 */

export function resolveAssetUrl(path: string): string;
export function resolveAssetUrl(path: null): null;
export function resolveAssetUrl(path: undefined): undefined;
export function resolveAssetUrl(path: string | null | undefined): string | null | undefined;
export function resolveAssetUrl(path: string | null | undefined): string | null | undefined {
  if (path == null || path === "") return path;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;
  return path;
}
