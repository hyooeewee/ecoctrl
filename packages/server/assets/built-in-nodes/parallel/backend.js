module.exports = async function execute(ctx, api) {
  const branches = ctx.config.branches || [];
  api.log.info(`[parallel] executing ${branches.length} branches`);

  if (branches.length === 0) {
    api.log.warn("[parallel] no branches configured");
    return { branches: [] };
  }

  const branchResults = await Promise.all(
    branches.map(async (branch, index) => {
      if (branch.nodes && branch.edges) {
        api.log.info(`[parallel] branch ${index + 1}/${branches.length} started`);
        try {
          const result = await api.workflow.executeSubGraph(branch.nodes, branch.edges);
          api.log.info(`[parallel] branch ${index + 1}/${branches.length} succeeded`);
          return { success: true, result };
        } catch (err) {
          api.log.error(`[parallel] branch ${index + 1}/${branches.length} failed: ${err.message}`);
          return { success: false, error: err.message };
        }
      }
      api.log.warn(`[parallel] branch ${index + 1}/${branches.length} has no nodes/edges`);
      return { success: true, result: {} };
    }),
  );

  const failures = branchResults.filter((r) => !r.success);
  if (failures.length > 0) {
    const failedIndices = branchResults
      .map((r, i) => (!r.success ? i + 1 : null))
      .filter(Boolean)
      .join(", ");
    api.log.error(
      `[parallel] ${failures.length}/${branches.length} branches failed (indices: ${failedIndices})`,
    );
    throw new Error(
      `parallel 节点有 ${failures.length} 个分支执行失败 (分支索引: ${failedIndices})`,
    );
  }

  api.log.info(`[parallel] all ${branches.length} branches completed`);
  return { branches: branchResults.map((r) => r.result) };
};
