module.exports = async function execute(ctx, api) {
  const status = ctx.config.status || "success";
  const endOutput = ctx.config.output || {};
  api.log.info(`[end] workflow ending with status="${status}"`);
  return { input: { status, output: endOutput }, raw: {} };
};
