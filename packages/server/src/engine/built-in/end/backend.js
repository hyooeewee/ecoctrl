module.exports = async function execute(ctx, api) {
  return {
    status: ctx.config.status || "success",
    output: ctx.config.output || {},
  };
};
