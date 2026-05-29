/**
 * Helper to fetch a model file with auth headers and return a Blob URL
 * that BabylonJS can load directly.
 *
 * BabylonJS SceneLoader can't send auth headers on its own fetch requests.
 * This fetches the file with the user's token, creates an Object URL.
 * Callers must pass pluginExtension (e.g. ".glb") to SceneLoader so it
 * picks the right loader — blob URLs have no file extension.
 */
import { auth } from "./auth";

export async function fetchModelUrl(url: string): Promise<string> {
  const token = auth.getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Failed to fetch model: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
