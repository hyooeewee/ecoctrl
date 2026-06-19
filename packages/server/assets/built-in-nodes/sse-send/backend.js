/**
 * SSE 推送 — EcoCtrl Plugin Node
 * Category: action
 */
module.exports = async function execute(ctx, api) {
  const eventType = String(ctx.config.eventType || "update:widgets");

  let payload = ctx.config.payload ?? {};
  if (typeof payload === "string") {
    const raw = payload.trim();
    if (!raw) {
      payload = {};
    } else {
      try {
        payload = JSON.parse(raw);
      } catch (err) {
        api.log.error(`[sse-send] payload resolved to invalid JSON: ${raw}`);
        throw new Error(`SSE payload is not valid JSON after template resolution: ${err.message}`);
      }
    }
  }

  const targetMode = String(ctx.config.targetMode || "broadcast");
  let targetUserId;

  if (targetMode === "user") {
    targetUserId = String(ctx.config.targetUserId || "");
    if (!targetUserId) {
      throw new Error('发送目标为"指定用户"时，目标用户 ID (targetUserId) 不能为空');
    }
  } else if (targetMode === "trigger") {
    targetUserId = api.context.triggerData?.userId;
  }
  // broadcast: targetUserId stays undefined

  const eventId = String(ctx.config.eventId || String(Date.now()));

  api.log.info(
    `[sse-send] emitting type=${eventType} target=${targetMode}${targetUserId ? ` user=${targetUserId}` : ""} id=${eventId}`,
  );

  await api.sse.emit(eventType, payload, targetUserId || undefined, eventId);

  api.log.info(`[sse-send] event emitted successfully`);

  return {
    sent: true,
    type: eventType,
    target: targetMode,
    targetUserId: targetUserId || null,
    eventId,
    payload,
  };
};
