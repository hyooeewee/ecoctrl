import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { count, eq } from "drizzle-orm";
import { seed } from "drizzle-seed";
import { intro, isCancel, multiselect, outro } from "@clack/prompts";
import * as schema from "@/schemas/index";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

import { USER_ROLE_LIST } from "@ecoctrl/shared";

// Custom Chinese data pools for realistic business data
const CN_NAMES = ["张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十"];
const CN_TASKS = [
  "发电机组季度维保",
  "冷水机组滤网更换",
  "BAS系统全面升级",
  "消防水泵月度试运行",
  "电梯限速器校验",
  "变压器红外测温",
  "生活水箱清洗消毒",
  "UPS蓄电池组检测",
];
const CN_LOCATIONS = [
  "B1 发电机房",
  "屋顶机房",
  "3F 弱电间",
  "B2 消防泵房",
  "各电梯机房",
  "B1 变配电室",
  "屋顶水箱间",
  "3F UPS 机房",
];
const CN_DEVICES = [
  "冷水主机 #1",
  "风机 #4",
  "电表 M-42",
  "空调 A1 机组",
  "水泵 P-03",
  "照明 L2-15",
];
const CN_FAULT_LEVELS = ["严重", "一般", "提示"];
const CN_FAULT_STATUS = ["待处理", "维保中", "已修复"];
const CN_ALERT_MESSAGES = [
  "能耗异常波动 (超出阈值 20%)",
  "电压不稳定告警",
  "例行维保提醒",
  "传感器故障",
  "通讯中断",
];
const REPORT_NAMES = ["周度能耗报表", "碳排放统计报表", "设备故障率分析", "季度审计报表"];
const REPORT_RECEIVERS = [
  "admin@energy.com",
  "sustainability@energy.com",
  "maintenance@energy.com",
  "audit@energy.com",
];
const REPORT_FREQS = ["每周一", "每月 1 日", "每月末", "每季度末"];

// ─── Module definitions ───────────────────────────────────────────

interface SeedModule {
  value: string;
  label: string;
  run: () => Promise<void>;
}

// ─── CLI parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlyModules = onlyArg ? onlyArg.slice(7).split(",") : null;

// ─── Seed functions (idempotent) ──────────────────────────────────

async function seedUsers() {
  const ecoctrlExists = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, "ecoctrl"));
  if (ecoctrlExists.length > 0) {
    console.log("[seed] mock users already seeded, skipping");
    return;
  }

  await seed(db, { users: schema.users }, { seed: 1 }).refine((f) => ({
    users: {
      count: 5,
      columns: {
        id: f.uuid(),
        username: f.valuesFromArray({ values: CN_NAMES, isUnique: true }),
        email: f.email(),
        role: f.valuesFromArray({ values: [...USER_ROLE_LIST] }),
        status: f.valuesFromArray({ values: ["online", "offline", "disabled", "busy"] }),
        lastLogin: f.valuesFromArray({
          values: [
            "2024-03-20 10:00",
            "2024-03-20 09:30",
            "2024-03-19 16:45",
            "2024-03-20 08:00",
            "2024-03-15 11:20",
          ],
        }),
        avatarUrl: f.default({ defaultValue: null }),
      },
    },
  }));

  // Set avatar for the first online user to match mock data
  const onlineUsers = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.status, "online"))
    .limit(1);
  if (onlineUsers.length > 0) {
    await db
      .update(schema.users)
      .set({ avatarUrl: "https://avatar.vercel.sh/admin?size=32" })
      .where(eq(schema.users.id, onlineUsers[0].id));
  }

  // Insert fixed mock users for authentication testing
  const mockPassword = await bcrypt.hash("P@ssword4ecoctrl", 10);
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    username: "ecoctrl",
    email: "ecoctrl@example.com",
    password: mockPassword,
    role: "super_admin",
    status: "online",
    lastLogin: null,
    avatarUrl: null,
  });

  console.log("[seed] seeded users");
}

async function seedMaintenance() {
  const existing = await db.select({ value: count() }).from(schema.maintenanceReminders);
  if (existing[0].value > 0) {
    console.log("[seed] maintenance reminders already seeded, skipping");
    return;
  }

  await seed(db, { maintenanceReminders: schema.maintenanceReminders }, { seed: 2 }).refine(
    (f) => ({
      maintenanceReminders: {
        count: 8,
        columns: {
          id: f.uuid(),
          task: f.valuesFromArray({ values: CN_TASKS }),
          description: f.loremIpsum({ sentencesCount: 2 }),
          dueDate: f.date({ minDate: "2026-04-18", maxDate: "2026-05-15" }),
          priority: f.valuesFromArray({ values: ["high", "medium", "low"] }),
          status: f.valuesFromArray({ values: ["pending", "in_progress", "completed"] }),
          assignee: f.valuesFromArray({
            values: ["张工", "李师傅", "王升级", "赵工", "维保单位", "刘工", "陈师傅", "周工"],
          }),
          location: f.valuesFromArray({ values: CN_LOCATIONS }),
          estimatedHours: f.int({ minValue: 1, maxValue: 8 }),
          lastCompleted: f.date({ minDate: "2025-04-10", maxDate: "2026-03-20" }),
        },
      },
    }),
  );
  console.log("[seed] seeded maintenance reminders");
}

async function seedFaults() {
  const existing = await db.select({ value: count() }).from(schema.faults);
  if (existing[0].value > 0) {
    console.log("[seed] faults already seeded, skipping");
    return;
  }

  await seed(db, { faults: schema.faults }, { seed: 3 }).refine((f) => ({
    faults: {
      count: 6,
      columns: {
        id: f.uuid(),
        device: f.valuesFromArray({ values: CN_DEVICES }),
        level: f.valuesFromArray({ values: CN_FAULT_LEVELS }),
        time: f.valuesFromArray({
          values: [
            "2024-03-20 10:15",
            "2024-03-20 09:45",
            "2024-03-20 08:30",
            "2024-03-21 14:20",
            "2024-03-21 11:00",
            "2024-03-19 16:45",
          ],
        }),
        status: f.valuesFromArray({ values: CN_FAULT_STATUS }),
      },
    },
  }));

  await db.insert(schema.faultStats).values({
    totalCount: 24,
    trend: "-12%",
    mttr: 4.2,
    avgResponseTime: "15min",
  });
  console.log("[seed] seeded faults and fault stats");
}

async function seedReports() {
  const existing = await db.select({ value: count() }).from(schema.reportPlans);
  if (existing[0].value > 0) {
    console.log("[seed] reports already seeded, skipping");
    return;
  }

  await seed(db, { reportPlans: schema.reportPlans }, { seed: 4 }).refine((f) => ({
    reportPlans: {
      count: 4,
      columns: {
        id: f.uuid(),
        name: f.valuesFromArray({ values: REPORT_NAMES }),
        receiver: f.valuesFromArray({ values: REPORT_RECEIVERS }),
        frequency: f.valuesFromArray({ values: REPORT_FREQS }),
        status: f.boolean(),
      },
    },
  }));

  const templates = [
    { name: "能耗日报", count: "1,245 份", icon: "📄" },
    { name: "月度汇总", count: "48 份", icon: "📊" },
    { name: "异常分析", count: "12 份", icon: "🔍" },
  ];
  await db.insert(schema.reportTemplates).values(templates);
  console.log("[seed] seeded reports");
}

async function seedDashboard() {
  const energyCount = await db.select({ value: count() }).from(schema.energyReadings);
  if (energyCount[0].value === 0) {
    const energyChart = [
      { name: "Mon", value: 400 },
      { name: "Tue", value: 300 },
      { name: "Wed", value: 500 },
      { name: "Thu", value: 280 },
      { name: "Fri", value: 590 },
      { name: "Sat", value: 320 },
      { name: "Sun", value: 250 },
    ];
    await db
      .insert(schema.energyReadings)
      .values(energyChart.map((e) => ({ hour: e.name, kWh: e.value })));
    console.log("[seed] created energy readings");
  }

  const alertCount = await db.select({ value: count() }).from(schema.alerts);
  if (alertCount[0].value === 0) {
    await seed(db, { alerts: schema.alerts }, { seed: 5 }).refine((f) => ({
      alerts: {
        count: 5,
        columns: {
          id: f.uuid(),
          device: f.valuesFromArray({
            values: ["中央空调 A1", "配电柜 B3", "水泵 C1", "电梯 #4", "照明控制系统"],
          }),
          level: f.valuesFromArray({ values: ["high", "medium", "low"] }),
          message: f.valuesFromArray({ values: CN_ALERT_MESSAGES }),
          time: f.valuesFromArray({
            values: ["10:15:22", "09:45:10", "08:00:00", "11:20:05", "10:55:30"],
          }),
          status: f.valuesFromArray({ values: ["pending", "resolved"] }),
        },
      },
    }));
    console.log("[seed] created alerts");
  }

  if (energyCount[0].value > 0 && alertCount[0].value > 0) {
    console.log("[seed] dashboard data already seeded, skipping");
  }
}

async function seedBackupSchedule() {
  const existing = await db.select({ value: count() }).from(schema.backupSchedules);
  if (existing[0].value > 0) {
    console.log("[seed] backup schedule already seeded, skipping");
    return;
  }

  await db.insert(schema.backupSchedules).values({ nextBackup: "2023-11-20 03:00" });
  console.log("[seed] seeded backup schedule");
}

async function seedEnergyAreas() {
  const existing = await db.select({ value: count() }).from(schema.energyAreas);
  if (existing[0].value > 0) {
    console.log("[seed] energy areas already seeded, skipping");
    return;
  }

  const areas = [
    {
      title: "A 栋办公区",
      current: 4200,
      target: 5000,
      color: "bg-primary",
      powerFactor: 0.94,
      loadRate: "72%",
    },
    {
      title: "B 栋研发中心",
      current: 8500,
      target: 7000,
      color: "bg-red-500",
      powerFactor: 0.94,
      loadRate: "72%",
    },
    {
      title: "C 栋生产车间",
      current: 15400,
      target: 20000,
      color: "bg-green-500",
      powerFactor: 0.94,
      loadRate: "72%",
    },
  ];
  await db.insert(schema.energyAreas).values(areas);
  console.log("[seed] seeded energy areas");
}

async function seedDashboardModel() {
  const existing = await db.select({ value: count() }).from(schema.dashboardModels);
  if (existing[0].value > 0) {
    console.log("[seed] dashboard model already seeded, skipping");
    return;
  }

  await db.insert(schema.dashboardModels).values({
    modelFileUrl: null,
    cameraPreset: "Default_View_01",
    ambientLightIntensity: 0.85,
    hotspots: [],
    labels: [],
  });
  console.log("[seed] seeded dashboard model config");
}

async function seedDashboardWidgets() {
  const existing = await db.select({ value: count() }).from(schema.dashboardWidgets);
  if (existing[0].value > 0) {
    console.log("[seed] dashboard widgets already seeded, skipping");
    return;
  }

  const widgets = [
    {
      titleKey: "totalEnergy",
      icon: "Wind",
      layoutX: 4,
      layoutY: 1,
      layoutW: 3,
      layoutH: 2,
      hidden: true,
      dataType: "stat" as const,
      dataJson: {
        value: "8,456",
        unit: "kWh",
        delta: "+12%",
        deltaVariant: "up-bad",
        sparkline: [280, 310, 295, 340, 380, 420, 395, 440, 410, 460, 480, 500],
        sparklineColor: "var(--color-chart-1)",
        footerKey: "totalEnergyFooter",
      },
      sortOrder: 0,
    },
    {
      titleKey: "todayCost",
      icon: "Banknote",
      layoutX: 1,
      layoutY: 1,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "stat" as const,
      dataJson: {
        value: "5,240",
        unit: "costUnit",
        delta: "+8%",
        deltaVariant: "up-bad",
        sparkline: [180, 210, 195, 240, 280, 310, 290, 330, 350, 370, 385, 400],
        sparklineColor: "var(--color-chart-4)",
        footerKey: "costFooter",
      },
      sortOrder: 1,
    },
    {
      titleKey: "carbonEmission",
      icon: "Leaf",
      layoutX: 1,
      layoutY: 3,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "stat" as const,
      dataJson: {
        value: "2,340",
        unit: "kg CO₂",
        delta: "+2%",
        deltaVariant: "up-bad",
        sparkline: [280, 320, 290, 350, 310, 270, 340],
        sparklineColor: "var(--color-chart-2)",
        footerKey: "carbonFooter",
      },
      sortOrder: 2,
    },
    {
      titleKey: "energyIntensity",
      icon: "Gauge",
      layoutX: 1,
      layoutY: 5,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "stat" as const,
      dataJson: {
        value: "98",
        unit: "kWh/m²",
        delta: "−7%",
        deltaVariant: "down-good",
        sparkline: [120, 115, 112, 108, 105, 103, 100, 99, 97, 96, 97, 98],
        sparklineColor: "var(--color-chart-1)",
        footerKey: "intensityFooter",
      },
      sortOrder: 3,
    },
    {
      titleKey: "loadStatus",
      icon: "Activity",
      layoutX: 1,
      layoutY: 7,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "stat" as const,
      dataJson: {
        value: "60",
        unit: "%",
        delta: "loadNormal",
        deltaVariant: "up-good",
        sparkline: [55, 58, 60, 63, 61, 60, 58, 59, 60, 62, 61, 60],
        sparklineColor: "var(--color-chart-2)",
        progressValue: 60,
      },
      sortOrder: 4,
    },
    {
      titleKey: "renewableRate",
      icon: "Sun",
      layoutX: 4,
      layoutY: 3,
      layoutW: 3,
      layoutH: 2,
      hidden: true,
      dataType: "stat" as const,
      dataJson: {
        value: "85",
        unit: "%",
        delta: "renewableTarget",
        deltaVariant: "neutral",
        sparkline: [78, 80, 81, 80, 82, 84, 83, 85, 84, 86, 85, 85],
        sparklineColor: "var(--color-cyber-green)",
        progressValue: 85,
      },
      sortOrder: 5,
    },
    {
      titleKey: "weather",
      icon: "Cloud",
      layoutX: 14,
      layoutY: 1,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "weather" as const,
      dataJson: {},
      sortOrder: 6,
    },
    {
      titleKey: "charts.trendTitle",
      icon: "TrendingUp",
      layoutX: 4,
      layoutY: 6,
      layoutW: 6,
      layoutH: 3,
      hidden: false,
      dataType: "chart" as const,
      dataJson: {
        chartType: "area",
        points: [
          { label: "Mon", value: 400 },
          { label: "Tue", value: 300 },
          { label: "Wed", value: 500 },
          { label: "Thu", value: 280 },
          { label: "Fri", value: 590 },
          { label: "Sat", value: 320 },
          { label: "Sun", value: 250 },
        ],
      },
      sortOrder: 7,
    },
    {
      titleKey: "charts.breakdownTitle",
      icon: "ChartPie",
      layoutX: 10,
      layoutY: 6,
      layoutW: 4,
      layoutH: 3,
      hidden: false,
      dataType: "chart" as const,
      dataJson: {
        chartType: "donut",
        items: [
          { label: "hvac", value: 45, color: "var(--color-chart-1)" },
          { label: "lighting", value: 30, color: "var(--color-chart-3)" },
          { label: "equipment", value: 15, color: "var(--color-chart-4)" },
          { label: "other", value: 10, color: "oklch(0.35 0.02 265)" },
        ],
      },
      sortOrder: 8,
    },
    {
      titleKey: "alerts.title",
      icon: "Bell",
      layoutX: 14,
      layoutY: 7,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "list" as const,
      dataJson: {
        items: [
          {
            icon: "AlertTriangle",
            title: "能耗异常波动 (超出阈值 20%)",
            subtitle: "中央空调 A1",
            severity: "critical",
            time: "10:15:22",
          },
          {
            icon: "ExclamationCircle",
            title: "电压不稳定告警",
            subtitle: "配电柜 B3",
            severity: "warning",
            time: "09:45:10",
          },
          {
            icon: "InfoCircle",
            title: "例行维保提醒",
            subtitle: "水泵 C1",
            severity: "info",
            time: "08:00:00",
          },
        ],
      },
      sortOrder: 9,
    },
    {
      titleKey: "devices.title",
      icon: "Monitor",
      layoutX: 14,
      layoutY: 5,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "list" as const,
      dataJson: {
        items: [
          { icon: "Wind", label: "devices.airConditioning", value: 6, status: "critical" },
          { icon: "Zap", label: "devices.lighting", value: 30, status: "warn" },
          { icon: "Elevator", label: "devices.elevators", value: 10, status: "ok" },
          { icon: "Server", label: "devices.servers", value: 24, status: "ok" },
        ],
      },
      sortOrder: 10,
    },
    {
      titleKey: "ai.title",
      icon: "BrainCircuit",
      layoutX: 14,
      layoutY: 3,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "list" as const,
      dataJson: {
        items: [
          {
            icon: "Wind",
            text: "优化暖通夜间计划——降低夜间温控设定值至 18°C",
            saving: "预计节能 12%",
          },
          { icon: "Zap", text: "根据占用传感器调整照明——B2–B4 区域", saving: "预计节能 8%" },
          {
            icon: "Server",
            text: "将非关键服务器任务迁移至低峰期 (02:00–06:00)",
            saving: "预计节省 5% 费用",
          },
        ],
      },
      sortOrder: 11,
    },
  ];

  await db.insert(schema.dashboardWidgets).values(widgets);
  console.log("[seed] seeded dashboard widgets");
}

async function seedIotTokens() {
  const existing = await db.select({ value: count() }).from(schema.iotTokens);
  if (existing[0].value > 0) {
    console.log("[seed] IoT tokens already seeded, skipping");
    return;
  }

  await db.insert(schema.iotTokens).values({
    accessToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTU4NjEwLCJkYXRhIjp7InVzZXJJZCI6bnVsbCwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc2NTY1ODEwfQ.y5w0z0ClwPhzKb0qqXqk_mF-3tIQp6GdB26a4E3gmH0",
    refreshToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTE1NzkxLCJkYXRhIjp7InVzZXJJZCI6ImFkbWluIiwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc5MTA3NzkxfQ.fg5BoJ7gbEkuQpVxrry8uKP73hoeZVO93F3LtjhSM5M",
    expiresAt: 1776565810000,
  });
  console.log("[seed] seeded IoT token");
}

// ─── Module registry ──────────────────────────────────────────────

const MODULES: SeedModule[] = [
  { value: "users", label: "Mock 用户 (users)", run: seedUsers },
  { value: "maintenance", label: "维保提醒 (maintenance)", run: seedMaintenance },
  { value: "faults", label: "故障数据 (faults)", run: seedFaults },
  { value: "reports", label: "报表数据 (reports)", run: seedReports },
  { value: "dashboard", label: "Dashboard 数据 (dashboard)", run: seedDashboard },
  { value: "widgets", label: "Dashboard 组件 (widgets)", run: seedDashboardWidgets },
  { value: "backup", label: "备份计划 (backup)", run: seedBackupSchedule },
  { value: "energy", label: "能耗区域 (energy)", run: seedEnergyAreas },
  { value: "model", label: "3D 模型配置 (model)", run: seedDashboardModel },
  { value: "tokens", label: "IoT Token (tokens)", run: seedIotTokens },
];

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  intro("ecoctrl db:seed");

  // Select modules
  let selected: string[];
  if (onlyModules) {
    const valid = MODULES.map((m) => m.value);
    const invalid = onlyModules.filter((m) => !valid.includes(m));
    if (invalid.length > 0) {
      console.error(`[seed] unknown modules: ${invalid.join(", ")}`);
      console.error(`[seed] valid modules: ${valid.join(", ")}`);
      process.exit(1);
    }
    selected = onlyModules;
  } else if (process.stdin.isTTY) {
    const result = await multiselect({
      message: "Select modules to seed (space to multi-select, enter to confirm):",
      options: MODULES.map((m) => ({ value: m.value, label: m.label })),
      required: true,
    });
    if (isCancel(result)) {
      outro("Cancelled.");
      process.exit(0);
    }
    selected = result as string[];
  } else {
    // Non-TTY (Docker): run all
    selected = MODULES.map((m) => m.value);
  }

  console.log(`[seed] selected modules: ${selected.join(", ")}`);

  // Execute in order
  for (const mod of MODULES) {
    if (!selected.includes(mod.value)) continue;
    try {
      await mod.run();
    } catch (err) {
      console.error(`[seed] failed at module "${mod.value}":`, err);
      process.exit(1);
    }
  }

  await client.end();
  outro("[seed] done");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
