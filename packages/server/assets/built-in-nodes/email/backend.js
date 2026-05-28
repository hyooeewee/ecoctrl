module.exports = async function execute(ctx, api) {
  const to = Array.isArray(ctx.config.to)
    ? ctx.config.to.map(String)
    : [String(ctx.config.to || "")];
  const filteredTo = to.filter(Boolean);
  if (filteredTo.length === 0) {
    throw new Error("Email recipient (to) is required but was not provided");
  }
  const from = String(ctx.config.from || "");
  const cc = String(ctx.config.cc || "");
  const bcc = String(ctx.config.bcc || "");
  const replyTo = String(ctx.config.replyTo || "");
  const subject = String(ctx.config.subject || "");
  const body = String(ctx.config.body || "");
  const bodyType = String(ctx.config.bodyType || "text");

  // Node-level SMTP overrides (all-or-nothing: partial config triggers strict error)
  const smtpHost = String(ctx.config.smtpHost || "");
  const smtpPort = ctx.config.smtpPort !== undefined ? Number(ctx.config.smtpPort) : undefined;
  const smtpUser = String(ctx.config.smtpUser || "");
  const smtpPass = String(ctx.config.smtpPass || "");
  const smtpSecure = ctx.config.smtpSecure === true;

  api.log.info(
    `[email] Preparing to send: to=${filteredTo.join(",")}, from=${from || "-"}, subject="${subject}", bodyType=${bodyType}, smtp=${smtpHost}:${smtpPort || "-"}, user=${smtpUser || "-"}`,
  );

  let result;
  try {
    result = await api.notify.sendMail({
      to: filteredTo,
      from: from || undefined,
      cc: cc || undefined,
      bcc: bcc || undefined,
      replyTo: replyTo || undefined,
      subject,
      body,
      bodyType,
      smtpHost: smtpHost || undefined,
      smtpPort,
      smtpUser: smtpUser || undefined,
      smtpPass: smtpPass || undefined,
      smtpSecure,
    });
  } catch (err) {
    api.log.error(
      `[email] Send failed: ${err.message}, to=${filteredTo.join(",")}, smtp=${smtpHost}:${smtpPort || "-"}`,
    );
    throw err;
  }

  api.log.info(
    `[email] Sent successfully: messageId=${result.messageId}, accepted=${result.accepted?.length ?? 0}, rejected=${result.rejected?.length ?? 0}, response="${result.response}"`,
  );

  return {
    sent: true,
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
    response: result.response,
    from: from || smtpUser,
    to: filteredTo,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || undefined,
    subject,
    bodyType,
  };
};
