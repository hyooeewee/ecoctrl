/**
 * Helper to fetch a model file and return a Blob URL for BabylonJS.
 *
 * BabylonJS SceneLoader can't send auth headers on its own requests,
 * so model file endpoints are public (auth hook bypasses them).
 * No Authorization header — allows the browser to use HTTP cache
 * (Cache-Control: public, max-age=3600 from the server).
 *
 * Callers must pass pluginExtension (e.g. ".glb") to SceneLoader so it
 * picks the right loader — blob URLs have no file extension.
 */
export async function fetchModelUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch model: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
