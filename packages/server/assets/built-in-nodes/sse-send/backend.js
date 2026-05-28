/**
 * SSE 推送 — EcoCtrl Plugin Node
 * Category: action
 */
module.exports = async function execute(ctx, api) {
  const eventType = String(ctx.config.eventType || "");
  if (!eventType) {
    throw new Error("SSE 事件类型 (eventType) 不能为空");
  }

  const payloadStr = String(ctx.config.payload || "{}");
  let payload;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    payload = { message: payloadStr };
  }

  const targetMode = String(ctx.config.targetMode || "trigger");
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

  api.log.info(
    `[sse-send] emitting type=${eventType} target=${targetMode}${targetUserId ? ` user=${targetUserId}` : ""}`,
  );

  await api.sse.emit(eventType, payload, targetUserId || undefined);

  api.log.info(`[sse-send] event emitted successfully`);

  return {
    sent: true,
    type: eventType,
    target: targetMode,
    targetUserId: targetUserId || null,
  };
};
