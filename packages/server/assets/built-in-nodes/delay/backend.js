module.exports = async function execute(ctx, api) {
  const durationMs = Number(ctx.config.durationMs || 0);

  if (durationMs <= 0) {
    api.log.warn(`[delay] durationMs=${durationMs} is not positive, skipping sleep`);
    return { delayedMs: 0 };
  }
  if (durationMs > 300000) {
    api.log.warn(`[delay] durationMs=${durationMs} exceeds max 300000ms, clamping to 300000ms`);
  }

  const actualMs = Math.min(durationMs, 300000);
  api.log.info(`[delay] sleeping for ${actualMs}ms`);

  await api.utils.sleep(actualMs);

  api.log.info(`[delay] slept for ${actualMs}ms`);
  return { delayedMs: actualMs };
};
