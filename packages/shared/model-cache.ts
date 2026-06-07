/**
 * Browser Cache API wrapper for persistent 3D model caching across page reloads.
 *
 * Uses caches.open() to store fetch responses so GLB/GLTF files survive
 * browser refreshes without re-downloading. Falls back to a plain fetch
 * when the Cache API is unavailable or fails.
 */

const MODEL_CACHE_NAME = "ecoctrl-models-v1";

/**
 * Fetch a model URL and return a Blob URL suitable for BabylonJS SceneLoader.
 * On first call the response is stored in the Cache API; subsequent calls
 * serve from cache.
 */
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
 * Remove a cached model file. Call when the file is deleted from config.
 * Errors are propagated so callers can decide whether to surface them.
 */
export async function clearModelCache(url: string): Promise<void> {
  const cache = await caches.open(MODEL_CACHE_NAME);
  await cache.delete(url);
}
