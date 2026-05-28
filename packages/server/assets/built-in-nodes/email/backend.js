module.exports = async function execute(ctx, api) {
  const to = Array.isArray(ctx.config.to)
    ? ctx.config.to.map(String)
    : [String(ctx.config.to || "")];
  const filteredTo = to.filter(Boolean);
  if (filteredTo.length === 0) {
    throw new Error("Email recipient (to) is required but was not provided");
  }
  const subject = String(ctx.config.subject || "");
  const body = String(ctx.config.body || "");
  const bodyType = String(ctx.config.bodyType || "text");

  await api.notify.sendMail({
    to: filteredTo,
    subject,
    body,
    bodyType,
  });

  return { sent: true };
};
