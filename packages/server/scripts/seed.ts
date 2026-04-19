import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { seed, reset } from "drizzle-seed";
import * as schema from "@/schemas/index";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

// Custom Chinese data pools for realistic business data
const CN_NAMES = ["张三", "李四", "王五", "赵六", "孙七", "周八", "吴九", "郑十"];
const CN_ROLES = ["超级管理员", "运维工程师", "财务分析师", "系统管理员", "观察员"];
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
const REPORT_NAMES = [
  "周度能耗报表",
  "碳排放统计报表",
  "设备故障率分析",
  "季度审计报表",
];
const REPORT_RECEIVERS = [
  "admin@energy.com",
  "sustainability@energy.com",
  "maintenance@energy.com",
  "audit@energy.com",
];
const REPORT_FREQS = ["每周一", "每月 1 日", "每月末", "每季度末"];

async function runReset() {
  await reset(db, schema);
  console.log("Reset all tables");
}

async function seedUsers() {
  await seed(db, { users: schema.users }, { seed: 1 }).refine((f) => ({
    users: {
      count: 5,
      columns: {
        id: f.uuid(),
        name: f.valuesFromArray({ values: CN_NAMES, isUnique: true }),
        email: f.email(),
        role: f.valuesFromArray({ values: CN_ROLES }),
        status: f.valuesFromArray({ values: ["active", "inactive"] }),
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
  // Set avatar for the first active user to match mock data
  const activeUsers = await db.select().from(schema.users).where(eq(schema.users.status, "active")).limit(1);
  if (activeUsers.length > 0) {
    await db
      .update(schema.users)
      .set({ avatarUrl: "https://avatar.vercel.sh/admin?size=32" })
      .where(eq(schema.users.id, activeUsers[0].id));
  }
  console.log("Seeded users");
}

async function seedMaintenance() {
  await seed(db, { maintenanceReminders: schema.maintenanceReminders }, { seed: 2 }).refine((f) => ({
    maintenanceReminders: {
      count: 8,
      columns: {
        id: f.uuid(),
        task: f.valuesFromArray({ values: CN_TASKS }),
        description: f.loremIpsum({ sentencesCount: 2 }),
        dueDate: f.date({ minDate: "2026-04-18", maxDate: "2026-05-15" }),
        priority: f.valuesFromArray({ values: ["high", "medium", "low"] }),
        status: f.valuesFromArray({ values: ["pending", "in_progress", "completed"] }),
        assignee: f.valuesFromArray({ values: ["张工", "李师傅", "王升级", "赵工", "维保单位", "刘工", "陈师傅", "周工"] }),
        location: f.valuesFromArray({ values: CN_LOCATIONS }),
        estimatedHours: f.int({ minValue: 1, maxValue: 8 }),
        lastCompleted: f.date({ minDate: "2025-04-10", maxDate: "2026-03-20" }),
      },
    },
  }));
  console.log("Seeded maintenance reminders");
}

async function seedFaults() {
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
  console.log("Seeded faults and fault stats");
}

async function seedReports() {
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
  console.log("Seeded reports");
}

async function seedDashboard() {
  const stats = [
    { key: "totalEnergy", value: "12,840", unit: "kWh", trend: "+12%", trendType: "up" as const },
    { key: "onlineRate", value: "98.2", unit: "%", trend: "+0.5%", trendType: "up" as const },
    { key: "pendingAlerts", value: "04", unit: "项", trend: "-2", trendType: "down" as const },
    { key: "carbonEmission", value: "842", unit: "kg", trend: "-4.2%", trendType: "down" as const },
  ];
  await db.insert(schema.dashboardStats).values(stats);

  const energyChart = [
    { name: "Mon", value: 400 }, { name: "Tue", value: 300 }, { name: "Wed", value: 500 },
    { name: "Thu", value: 280 }, { name: "Fri", value: 590 }, { name: "Sat", value: 320 }, { name: "Sun", value: 250 },
  ];
  await db.insert(schema.energyReadings).values(energyChart.map((e) => ({ hour: e.name, kWh: e.value })));

  await seed(db, { alerts: schema.alerts }, { seed: 5 }).refine((f) => ({
    alerts: {
      count: 5,
      columns: {
        id: f.uuid(),
        device: f.valuesFromArray({ values: ["中央空调 A1", "配电柜 B3", "水泵 C1", "电梯 #4", "照明控制系统"] }),
        level: f.valuesFromArray({ values: ["high", "medium", "low"] }),
        message: f.valuesFromArray({ values: CN_ALERT_MESSAGES }),
        time: f.valuesFromArray({ values: ["10:15:22", "09:45:10", "08:00:00", "11:20:05", "10:55:30"] }),
        status: f.valuesFromArray({ values: ["pending", "resolved"] }),
      },
    },
  }));

  const cards = [
    { titleKey: "totalEnergy", value: "8,456", unit: "kWh", delta: "+12%", deltaVariant: "up-bad" as const, chartType: "area" as const, chartData: [{ v: 280 }, { v: 310 }, { v: 295 }, { v: 340 }, { v: 380 }, { v: 420 }, { v: 395 }, { v: 440 }, { v: 410 }, { v: 460 }, { v: 480 }, { v: 500 }], chartColor: "var(--color-chart-1)", footerKey: "totalEnergyFooter", sortOrder: 0 },
    { titleKey: "carbonEmission", value: "2,340", unit: "kg CO₂", delta: "+2%", deltaVariant: "up-bad" as const, chartType: "bar" as const, chartData: [{ v: 280 }, { v: 320 }, { v: 290 }, { v: 350 }, { v: 310 }, { v: 270 }, { v: 340 }], chartColor: "var(--color-chart-2)", footerKey: "carbonFooter", sortOrder: 1 },
    { titleKey: "energyIntensity", value: "98", unit: "kWh/m²", delta: "−7%", deltaVariant: "down-good" as const, chartType: "line" as const, chartData: [{ v: 120 }, { v: 115 }, { v: 112 }, { v: 108 }, { v: 105 }, { v: 103 }, { v: 100 }, { v: 99 }, { v: 97 }, { v: 96 }, { v: 97 }, { v: 98 }], chartColor: "var(--color-chart-1)", footerKey: "intensityFooter", sortOrder: 2 },
    { titleKey: "todayCost", value: "5,240", unit: "costUnit", delta: "+8%", deltaVariant: "up-bad" as const, chartType: "area" as const, chartData: [{ v: 180 }, { v: 210 }, { v: 195 }, { v: 240 }, { v: 280 }, { v: 310 }, { v: 290 }, { v: 330 }, { v: 350 }, { v: 370 }, { v: 385 }, { v: 400 }], chartColor: "var(--color-chart-4)", footerKey: "costFooter", sortOrder: 3 },
    { titleKey: "renewableRate", value: "85", unit: "%", delta: "renewableTarget", deltaVariant: "neutral" as const, chartType: "progress" as const, chartData: [{ v: 78 }, { v: 80 }, { v: 81 }, { v: 80 }, { v: 82 }, { v: 84 }, { v: 83 }, { v: 85 }, { v: 84 }, { v: 86 }, { v: 85 }, { v: 85 }], chartColor: "var(--color-cyber-green)", progressValue: 85, sortOrder: 4 },
    { titleKey: "loadStatus", value: "60", unit: "%", delta: "loadNormal", deltaVariant: "up-good" as const, chartType: "progress" as const, chartData: [{ v: 55 }, { v: 58 }, { v: 60 }, { v: 63 }, { v: 61 }, { v: 60 }, { v: 58 }, { v: 59 }, { v: 60 }, { v: 62 }, { v: 61 }, { v: 60 }], chartColor: "var(--color-chart-2)", progressValue: 60, sortOrder: 5 },
  ];
  await db.insert(schema.dashboardCards).values(cards);

  const breakdowns = [
    { category: "hvac", value: 45, color: "var(--color-chart-1)" },
    { category: "lighting", value: 30, color: "var(--color-chart-3)" },
    { category: "equipment", value: 15, color: "var(--color-chart-4)" },
    { category: "other", value: 10, color: "oklch(0.35 0.02 265)" },
  ];
  await db.insert(schema.energyBreakdowns).values(breakdowns);

  console.log("Seeded dashboard data");
}

async function seedBackupSchedule() {
  await db.insert(schema.backupSchedules).values({ nextBackup: "2023-11-20 03:00" });
  console.log("Seeded backup schedule");
}

async function seedEnergyAreas() {
  const areas = [
    { title: "A 栋办公区", current: 4200, target: 5000, color: "bg-primary", powerFactor: 0.94, loadRate: "72%" },
    { title: "B 栋研发中心", current: 8500, target: 7000, color: "bg-red-500", powerFactor: 0.94, loadRate: "72%" },
    { title: "C 栋生产车间", current: 15400, target: 20000, color: "bg-green-500", powerFactor: 0.94, loadRate: "72%" },
  ];
  await db.insert(schema.energyAreas).values(areas);
  console.log("Seeded energy areas");
}

async function seedModels() {
  const models = [
    { id: "1", name: "冷却塔模型_1", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
    { id: "2", name: "冷却塔模型_2", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
    { id: "3", name: "冷却塔模型_3", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
    { id: "4", name: "冷却塔模型_4", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
    { id: "5", name: "冷却塔模型_5", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
    { id: "6", name: "冷却塔模型_6", version: "v2.1", format: "GLB", size: "12.4MB", thumbnailUrl: null, docUrl: null },
  ];
  await db.insert(schema.models).values(models);
  console.log("Seeded models");
}

async function seedThreeDConfig() {
  await db.insert(schema.threeDConfigs).values({
    cameraPreset: "Default_View_01",
    ambientLightIntensity: 0.85,
    hotspots: [],
    labels: [],
  });
  console.log("Seeded 3D config");
}

async function seedPlatformConfig() {
  await db.insert(schema.platformConfigs).values({
    platformName: "EcoCtrl 能管平台",
    refreshInterval: 30,
    realtimeAlertEnabled: true,
    darkModeFollowSystem: false,
  });
  console.log("Seeded platform config");
}

async function seedIotTokens() {
  await db.insert(schema.iotTokens).values({
    accessToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTU4NjEwLCJkYXRhIjp7InVzZXJJZCI6bnVsbCwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc2NTY1ODEwfQ.y5w0z0ClwPhzKb0qqXqk_mF-3tIQp6GdB26a4E3gmH0",
    refreshToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTE1NzkxLCJkYXRhIjp7InVzZXJJZCI6ImFkbWluIiwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc5MTA3NzkxfQ.fg5BoJ7gbEkuQpVxrry8uKP73hoeZVO93F3LtjhSM5M",
    expiresAt: 1776565810000,
  });
  console.log("Seeded IoT token");
}

async function main() {
  console.log("Resetting and seeding database...");
  await runReset();
  await seedUsers();
  await seedMaintenance();
  await seedFaults();
  await seedReports();
  await seedDashboard();
  await seedBackupSchedule();
  await seedEnergyAreas();
  await seedModels();
  await seedThreeDConfig();
  await seedPlatformConfig();
  await seedIotTokens();
  console.log("Done!");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
