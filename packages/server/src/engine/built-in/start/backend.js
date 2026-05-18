module.exports = async function execute(ctx, api) {
  return { data: api.context.triggerData };
};
