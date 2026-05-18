module.exports = async function execute(ctx, api) {
  const to = Array.isArray(ctx.config.to)
    ? ctx.config.to.map(String)
    : [String(ctx.config.to || "")];
  const subject = String(ctx.config.subject || "");
  const body = String(ctx.config.body || "");
  const bodyType = String(ctx.config.bodyType || "text");

  await api.notify.sendMail({
    to: to.filter(Boolean),
    subject,
    body,
    bodyType,
  });

  return { sent: true };
};
