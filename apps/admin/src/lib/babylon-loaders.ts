/**
 * Helper to fetch a model file and return a Blob URL for BabylonJS.
 *
 * Uses the Cache API for persistent cross-session caching so model files
 * survive page reloads without re-downloading. Falls back to a plain fetch
 * when the Cache API is unavailable or fails.
 *
 * Callers must pass pluginExtension (e.g. ".glb") to SceneLoader so it
 * picks the right loader — blob URLs have no file extension.
 */

const MODEL_CACHE_NAME = "ecoctrl-models-v1";

export async function fetchModelUrl(url: string): Promise<string> {
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    let response = await cache.match(url);

    if (!response) {
      response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch model: ${response.status}`);
      await cache.put(url, response.clone());
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    // Fallback when Cache API is unavailable, disabled, or throws.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch model: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
}

/**
 * Remove a cached model file. Called when the file is deleted from config.
 */
export async function clearModelCache(url: string): Promise<void> {
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    await cache.delete(url);
  } catch {
    // Ignore cleanup failures.
  }
}
