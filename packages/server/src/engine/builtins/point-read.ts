import type { PluginDefinition, PluginManifest } from "../plugin-types";

const manifest: PluginManifest = {
  id: "point_read",
  name: "Read Point",
  version: "1.0.0",
  category: "action",
  description: "Read current value from an IoT point",
  entry: "backend.js",
  schema: "schema.json",
  color: "#3b82f6",
};

const schema: Record<string, unknown> = {
  type: "object",
  properties: {
    pointId: {
      type: "string",
      title: "Point ID",
      description: "IoT point code to read",
    },
  },
  required: ["pointId"],
};

const backendCode = `
module.exports = async function execute(ctx, api) {
  const pointId = ctx.config.pointId;
  if (!pointId) {
    throw new Error("pointId is required");
  }
  const value = await api.iot.readPoint(pointId);
  api.log.info("Read point " + pointId + " = " + JSON.stringify(value));
  return { value };
};
`;

export const pointReadPlugin: PluginDefinition = {
  id: manifest.id,
  version: manifest.version,
  manifest,
  backendCode,
  schema,
};
