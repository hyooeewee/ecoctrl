/**
 * EcoCtrl Plugin Node — backend.js
 *
 * Available APIs via the `api` object:
 *   api.variables.{get,set,delete,all}
 *   api.http.{get,post,put,patch,delete}
 *   api.iot.{readPoint,readPoints,writePoint}
 *   api.notify.{send,sendMail}
 *   api.log.{info,warn,error}
 *   api.env.get
 *   api.context.{workflowId,executionId,triggerData,nodeId,nodeName}
 *   api.utils.sleep
 *   api.expr.{evaluateBoolean,evaluateExpression}
 *   api.db.execute(operation, table, where?, data?, returning?)
 *   api.workflow.executeSubGraph(nodes, edges)
 *
 * @param {object} ctx  - Execution context (triggerData, variables, nodeOutputs)
 * @param {object} api  - Plugin API surface
 * @returns {Promise<object>} - Return value becomes the node's output
 */
module.exports = async function (ctx, api) {
  // Example: read an IoT point
  // const value = await api.iot.readPoint("room-temp");

  // Example: call external HTTP API
  // const res = await api.http.get("https://api.example.com/data");

  // Example: set a workflow variable
  // api.variables.set("result", { ok: true });

  // Example: log
  // api.log.info("Plugin executed", { nodeId: api.context.nodeId });

  return { success: true };
};
