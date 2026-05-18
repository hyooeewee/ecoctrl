module.exports = async function execute(ctx, api) {
  const branches = ctx.config.branches || [];
  if (branches.length === 0) {
    return { branches: [] };
  }
  const branchResults = await Promise.all(
    branches.map(async (branch) => {
      if (branch.nodes && branch.edges) {
        return api.workflow.executeSubGraph(branch.nodes, branch.edges);
      }
      return {};
    }),
  );
  return { branches: branchResults };
};
