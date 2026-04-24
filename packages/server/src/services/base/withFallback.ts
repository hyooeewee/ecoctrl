export function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T),
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch {
      return typeof fallback === "function" ? (fallback as () => T)() : fallback;
    }
  };
}
