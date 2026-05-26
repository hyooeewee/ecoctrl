import type { PluginDefinition, PluginManifest } from "../plugin-types";

const manifest: PluginManifest = {
  id: "point_write",
  name: "Write Point",
  version: "1.0.0",
  category: "action",
  description: "Write value to an IoT point",
  entry: "backend.js",
  schema: "schema.json",
  color: "#ef4444",
};

const schema: Record<string, unknown> = {
  type: "object",
  properties: {
    pointId: {
      type: "string",
      title: "Point ID",
      description: "IoT point code to write",
    },
    value: {
      type: "string",
      title: "Value",
      description: "Value to write (will be parsed to number/boolean if possible)",
    },
  },
  required: ["pointId", "value"],
};

const backendCode = `
module.exports = async function execute(ctx, api) {
  const pointId = ctx.config.pointId;
  let value = ctx.config.value;
  if (!pointId) {
    throw new Error("pointId is required");
  }
  // Auto-parse numeric/boolean strings
  if (typeof value === "string") {
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!isNaN(Number(value))) value = Number(value);
  }
  await api.iot.writePoint(pointId, value);
  api.log.info("Wrote point " + pointId + " = " + JSON.stringify(value));
  return { success: true };
};
`;

export const pointWritePlugin: PluginDefinition = {
  id: manifest.id,
  version: manifest.version,
  manifest,
  backendCode,
  schema,
};
