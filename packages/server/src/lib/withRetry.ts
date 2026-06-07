// ========================================
// withRetry — generic retry wrapper
// ========================================

export type BackoffStrategy = "fixed" | "linear" | "exponential";

export interface RetryOptions {
  /** Maximum retry attempts (excluding the first try). Defaults to 3. */
  maxRetries?: number;
  /** Base delay between retries in milliseconds. Defaults to 2000. */
  delayMs?: number;
  /** Backoff strategy. Defaults to "exponential". */
  backoff?: BackoffStrategy;
  /** Maximum delay cap in milliseconds. Defaults to 30000. */
  maxDelayMs?: number;
  /** Called before each retry with (attempt, maxRetries, error, nextDelayMs). */
  onRetry?: (attempt: number, maxRetries: number, error: unknown, nextDelayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(
  attempt: number,
  delayMs: number,
  backoff: BackoffStrategy,
  maxDelayMs: number,
): number {
  let next: number;
  switch (backoff) {
    case "fixed":
      next = delayMs;
      break;
    case "linear":
      next = delayMs * attempt;
      break;
    case "exponential":
    default:
      next = delayMs * 2 ** (attempt - 1);
      break;
  }
  return Math.min(next, maxDelayMs);
}

/**
 * Wraps an async function with retry logic.
 * Retries up to `maxRetries` times with configurable backoff.
 * Calls `onRetry` before each retry for logging/warning.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const delayMs = options.delayMs ?? 2000;
  const backoff = options.backoff ?? "exponential";
  const maxDelayMs = options.maxDelayMs ?? 30000;
  const onRetry = options.onRetry;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const nextDelay = computeDelay(attempt, delayMs, backoff, maxDelayMs);
        onRetry?.(attempt, maxRetries, err, nextDelay);
        await sleep(nextDelay);
      }
    }
  }

  throw lastErr;
}
