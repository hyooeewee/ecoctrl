const statItemSchema = {
  type: "object",
  properties: {
    value: { type: "string" },
    unit: { type: "string" },
    trend: { type: "string" },
    trendType: { type: "string", enum: ["up", "down"] },
  },
} as const;

const alertSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    device: { type: "string" },
    level: { type: "string", enum: ["high", "medium", "low"] },
    message: { type: "string" },
    time: { type: "string" },
    status: { type: "string", enum: ["pending", "resolved"] },
  },
} as const;

const cardSchema = {
  type: "object",
  properties: {
    titleKey: { type: "string" },
    value: { type: "string" },
    unit: { type: "string" },
    delta: { type: "string" },
    deltaVariant: {
      type: "string",
      enum: ["up-good", "up-bad", "down-good", "down-bad", "neutral"],
    },
    chartType: { type: "string", enum: ["area", "bar", "line", "progress"] },
    chartData: {
      type: "array",
      items: { type: "object", properties: { v: { type: "number" } } },
    },
    chartColor: { type: "string" },
    footerKey: { type: "string" },
    progressValue: { type: "number" },
  },
} as const;

const trendSchema = {
  type: "object",
  properties: {
    h: { type: "string" },
    kWh: { type: "number" },
  },
} as const;

const breakdownSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    value: { type: "number" },
    color: { type: "string" },
  },
} as const;

export const dashboardDataSchema = {
  summary: "Get full dashboard data",
  response: {
    200: {
      type: "object",
      properties: {
        cards: { type: "array", items: cardSchema },
        trend: { type: "array", items: trendSchema },
        breakdown: { type: "array", items: breakdownSchema },
      },
    },
  },
} as const;

export const statsSchema = {
  summary: "Get dashboard statistics",
  response: {
    200: {
      type: "object",
      properties: {
        totalEnergy: statItemSchema,
        onlineRate: statItemSchema,
        pendingAlerts: statItemSchema,
        carbonEmission: statItemSchema,
      },
    },
  },
} as const;

export const energyChartSchema = {
  summary: "Get weekly energy chart data",
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: { type: "number" },
        },
      },
    },
  },
} as const;

export const alertsSchema = {
  summary: "Get recent alerts",
  querystring: {
    type: "object",
    properties: {
      limit: { type: "integer", description: "Max number of alerts to return" },
    },
  },
  response: {
    200: {
      type: "array",
      items: alertSchema,
    },
  },
} as const;
