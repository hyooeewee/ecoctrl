module.exports = async function execute(ctx, api) {
  const triggerData = api.context.triggerData;
  api.log.info(
    `[start] workflow triggered, data keys=${Object.keys(triggerData || {}).join(", ") || "none"}`,
  );
  return { data: triggerData };
};
