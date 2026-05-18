module.exports = async function execute(ctx, api) {
  const durationMs = Number(ctx.config.durationMs || 0);
  if (durationMs > 0 && durationMs <= 300000) {
    await api.utils.sleep(durationMs);
  }
  return { delayedMs: durationMs };
};
