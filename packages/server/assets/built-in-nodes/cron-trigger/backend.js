/**
 * Cron Trigger — EcoCtrl Plugin Node
 * Category: trigger
 *
 * Fires on a cron schedule. Returns trigger context for downstream nodes.
 */
module.exports = async function (ctx, api) {
  const { cron, timezone } = ctx.config;
  const tz = timezone || "UTC";
  const now = new Date().toISOString();

  api.log.info("cron-trigger fired", {
    nodeId: api.context.nodeId,
    cron,
    timezone: tz,
    triggeredAt: now,
  });

  return {
    input: { cron, timezone: tz },
    raw: { triggered: true, timestamp: now },
  };
};
