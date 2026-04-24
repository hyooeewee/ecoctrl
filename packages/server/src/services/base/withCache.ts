interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  expiresAt: number | null;
}

export function withCache<T>(
  fn: () => Promise<T>,
  ttlMs: number,
) {
  let cache: CacheEntry<T> | null = null;
  let hits = 0;
  let misses = 0;

  async function get(): Promise<T> {
    if (cache && Date.now() < cache.expiresAt) {
      hits++;
      return cache.data;
    }
    misses++;
    const data = await fn();
    cache = { data, expiresAt: Date.now() + ttlMs };
    return data;
  }

  function clear(): void {
    cache = null;
  }

  function getStats(): CacheStats {
    return {
      hits,
      misses,
      expiresAt: cache?.expiresAt ?? null,
    };
  }

  return { get, clear, getStats };
}
