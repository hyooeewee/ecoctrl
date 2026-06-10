// ========================================
// Priority-Based Model Loading Orchestrator
// ========================================

export interface PriorityLoadOptions<T extends { priority?: "critical" | "background" }> {
  models: T[];
  loadFn: (model: T) => Promise<void>;
  parallel?: boolean;
  onCriticalDone?: () => void | Promise<void>;
  onBackgroundError?: (model: T, err: unknown) => void;
  isCancelled?: () => boolean;
}

/**
 * Load models in priority order:
 * 1. critical models first
 * 2. onCriticalDone callback fired
 * 3. background models second
 *
 * When `parallel` is true, each batch loads via Promise.all.
 * When false, models load sequentially.
 */
export async function loadModelsByPriority<T extends { priority?: "critical" | "background" }>(
  options: PriorityLoadOptions<T>,
): Promise<void> {
  const {
    models,
    loadFn,
    parallel = false,
    onCriticalDone,
    onBackgroundError,
    isCancelled,
  } = options;

  const critical = models.filter((m) => m.priority === "critical");
  const background = models.filter((m) => m.priority !== "critical");

  const runBatch = async (batch: T[], isBackground: boolean) => {
    if (parallel) {
      await Promise.all(
        batch.map((m) => {
          if (isCancelled?.()) return Promise.resolve();
          if (isBackground) {
            return loadFn(m).catch((err: unknown) => onBackgroundError?.(m, err));
          }
          return loadFn(m);
        }),
      );
    } else {
      for (const m of batch) {
        if (isCancelled?.()) break;
        if (isBackground) {
          try {
            await loadFn(m);
          } catch (err: unknown) {
            onBackgroundError?.(m, err);
          }
        } else {
          await loadFn(m);
        }
      }
    }
  };

  // Phase 1: critical
  await runBatch(critical, false);
  await onCriticalDone?.();

  // Phase 2: background — errors are non-fatal
  await runBatch(background, true);
}
