import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/schemas/index";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

async function clearTables() {
  const tables = [
    "users",
    "maintenance_reminders",
    "faults",
    "fault_stats",
    "report_plans",
    "report_templates",
    "dashboard_stats",
    "energy_readings",
    "energy_breakdowns",
    "dashboard_cards",
    "alerts",
    "iot_tokens",
  ];
  for (const t of tables) {
    await client`TRUNCATE TABLE ${client(t)} RESTART IDENTITY CASCADE`;
  }
  console.log("Cleared existing data");
}

async function seedUsers() {
  const users = [
    { id: "a1b2c3d4-5678-90ab-cdef-123456789012", name: "张三", email: "zhangsan@energy.com", role: "超级管理员", status: "active" as const, lastLogin: "2024-03-20 10:00" },
    { id: "b2c3d4e5-6789-01bc-defa-234567890123", name: "李四", email: "lisi@energy.com", role: "运维工程师", status: "active" as const, lastLogin: "2024-03-20 09:30" },
    { id: "c3d4e5f6-7890-12cd-efab-345678901234", name: "王五", email: "wangwu@energy.com", role: "财务分析师", status: "inactive" as const, lastLogin: "2024-03-19 16:45" },
    { id: "d4e5f6a7-8901-23de-fabc-456789012345", name: "赵六", email: "zhaoliu@energy.com", role: "系统管理员", status: "active" as const, lastLogin: "2024-03-20 08:00" },
    { id: "e5f6a7b8-9012-34ef-abcd-567890123456", name: "孙七", email: "sunqi@energy.com", role: "观察员", status: "active" as const, lastLogin: "2024-03-15 11:20" },
  ];
  await db.insert(schema.users).values(users);
  console.log(`Seeded ${users.length} users`);
}

async function seedMaintenance() {
  const items = [
    { id: "290348b7-e3aa-4df6-bf18-da2e43fdc367", task: "发电机组季度维保", description: "对主发电机组进行全面检查，包括机油更换、滤清器清洁、皮带张力检测及运行参数校准，确保备用电源可靠性。", dueDate: "2026-04-25", priority: "high" as const, status: "pending" as const, assignee: "张工", location: "B1 发电机房", estimatedHours: 4, lastCompleted: "2025-10-20" },
    { id: "52ee7449-6028-4b1c-b2ee-86d26562977c", task: "冷水机组滤网更换", description: "更换中央空调冷水机组进风滤网，清洗冷凝器翅片，检查冷媒压力及压缩机运行电流。", dueDate: "2026-04-18", priority: "medium" as const, status: "in_progress" as const, assignee: "李师傅", location: "屋顶机房", estimatedHours: 2, lastCompleted: "2025-12-15" },
    { id: "532921b3-563e-419c-b3db-bf68f03c93c0", task: "BAS系统全面升级", description: "升级楼宇控制系统至v3.0", dueDate: "2026-05-01", priority: "high" as const, status: "in_progress" as const, assignee: "王升级", location: "3F 弱电间", estimatedHours: 8 },
    { id: "dec61c4c-39a4-4fc6-962d-9b540341ccaf", task: "消防水泵月度试运行", description: "手动启停主备消防水泵，检查压力表读数、阀门启闭状态、电机温升及控制柜信号反馈。", dueDate: "2026-04-20", priority: "high" as const, status: "pending" as const, assignee: "赵工", location: "B2 消防泵房", estimatedHours: 1, lastCompleted: "2026-03-20" },
    { id: "2bde77ac-d2d3-4328-9022-013adeb182fd", task: "电梯限速器校验", description: "委托第三方机构对全部客梯限速器进行动作速度测试，出具校验报告并更新电梯台账。", dueDate: "2026-05-05", priority: "high" as const, status: "pending" as const, assignee: "维保单位", location: "各电梯机房", estimatedHours: 6, lastCompleted: "2025-04-10" },
    { id: "e3f7c971-721e-4724-8a80-e56712a9cc90", task: "变压器红外测温", description: "使用红外热像仪对高低压配电变压器进行非接触式测温，记录各相绕组及接线端子温升数据。", dueDate: "2026-04-22", priority: "medium" as const, status: "completed" as const, assignee: "刘工", location: "B1 变配电室", estimatedHours: 2, lastCompleted: "2025-10-22" },
    { id: "00e6b46e-2f00-4082-8674-c87af4a2fa61", task: "生活水箱清洗消毒", description: "排空生活水箱，进行内壁刷洗、消毒药剂投加及水质检测，确保符合国家生活饮用水卫生标准。", dueDate: "2026-05-10", priority: "medium" as const, status: "pending" as const, assignee: "陈师傅", location: "屋顶水箱间", estimatedHours: 5, lastCompleted: "2025-11-10" },
    { id: "99489b62-b18f-4260-8d85-0524cae02337", task: "UPS 蓄电池组检测", description: "对不间断电源蓄电池组进行内阻测试、容量放电试验，更换内阻超标或容量衰减超过 30% 的单体电池。", dueDate: "2026-05-15", priority: "low" as const, status: "pending" as const, assignee: "周工", location: "3F UPS 机房", estimatedHours: 3, lastCompleted: "2025-05-15" },
  ];
  await db.insert(schema.maintenanceReminders).values(items);
  console.log(`Seeded ${items.length} maintenance reminders`);
}

async function seedFaults() {
  const items = [
    { id: "6cb9a0a7-6fc5-4d9b-b26c-36a59ebcfc5c", device: "冷水主机 #1", level: "严重", time: "2024-03-20 10:15", status: "待处理" },
    { id: "bb1c6e78-7936-4fcb-9e9c-e6d365a5f7f2", device: "风机 #4", level: "一般", time: "2024-03-20 09:45", status: "维保中" },
    { id: "e4859c0d-c3d9-485b-900b-22b686e2a382", device: "电表 M-42", level: "提示", time: "2024-03-20 08:30", status: "已修复" },
    { id: "1c8c8cff-6a2c-4ee5-a83d-8ffafe013bee", device: "空调 A1 机组", level: "严重", time: "2024-03-21 14:20", status: "维保中" },
    { id: "ca0ca409-5455-4760-920b-d7a1eae18808", device: "水泵 P-03", level: "一般", time: "2024-03-21 11:00", status: "待处理" },
    { id: "b0b23506-f294-4220-9bec-344c2d8df266", device: "照明 L2-15", level: "提示", time: "2024-03-19 16:45", status: "已修复" },
  ];
  await db.insert(schema.faults).values(items);
  console.log(`Seeded ${items.length} faults`);

  await db.insert(schema.faultStats).values({ totalCount: 24, trend: "-12%", mttr: 4.2, avgResponseTime: "15min" });
  console.log("Seeded fault stats");
}

async function seedReports() {
  const plans = [
    { id: "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c", name: "周度能耗报表", receiver: "admin@energy.com", frequency: "每周一", status: true },
    { id: "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d", name: "碳排放统计报表", receiver: "sustainability@energy.com", frequency: "每月 1 日", status: true },
    { id: "8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e", name: "设备故障率分析", receiver: "maintenance@energy.com", frequency: "每月末", status: false },
    { id: "cc5a017c-c44a-41d0-81cf-f9ff20989d35", name: "季度审计报表", receiver: "audit@energy.com", frequency: "每季度末", status: false },
  ];
  await db.insert(schema.reportPlans).values(plans);
  console.log(`Seeded ${plans.length} report plans`);

  const templates = ["能耗日报", "故障分析月报", "系统审计简报"];
  await db.insert(schema.reportTemplates).values(templates.map((name) => ({ name })));
  console.log(`Seeded ${templates.length} report templates`);
}

async function seedDashboard() {
  const stats = [
    { key: "totalEnergy", value: "12,840", unit: "kWh", trend: "+12%", trendType: "up" as const },
    { key: "onlineRate", value: "98.2", unit: "%", trend: "+0.5%", trendType: "up" as const },
    { key: "pendingAlerts", value: "04", unit: "项", trend: "-2", trendType: "down" as const },
    { key: "carbonEmission", value: "842", unit: "kg", trend: "-4.2%", trendType: "down" as const },
  ];
  await db.insert(schema.dashboardStats).values(stats);
  console.log("Seeded dashboard stats");

  const energyChart = [
    { name: "Mon", value: 400 }, { name: "Tue", value: 300 }, { name: "Wed", value: 500 },
    { name: "Thu", value: 280 }, { name: "Fri", value: 590 }, { name: "Sat", value: 320 }, { name: "Sun", value: 250 },
  ];
  await db.insert(schema.energyReadings).values(energyChart.map((e) => ({ hour: e.name, kWh: e.value })));
  console.log(`Seeded ${energyChart.length} energy readings`);

  const alertItems = [
    { id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d", device: "中央空调 A1", level: "high" as const, message: "能耗异常波动 (超出阈值 20%)", time: "10:15:22", status: "pending" as const },
    { id: "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e", device: "配电柜 B3", level: "medium" as const, message: "电压不稳定告警", time: "09:45:10", status: "pending" as const },
    { id: "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f", device: "水泵 C1", level: "low" as const, message: "例行维保提醒", time: "08:00:00", status: "resolved" as const },
    { id: "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a", device: "电梯 #4", level: "high" as const, message: "传感器故障", time: "11:20:05", status: "pending" as const },
    { id: "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b", device: "照明控制系统", level: "medium" as const, message: "通讯中断", time: "10:55:30", status: "pending" as const },
  ];
  await db.insert(schema.alerts).values(alertItems);
  console.log(`Seeded ${alertItems.length} alerts`);

  const cards = [
    { titleKey: "totalEnergy", value: "8,456", unit: "kWh", delta: "+12%", deltaVariant: "up-bad" as const, chartType: "area" as const, chartData: [{ v: 280 }, { v: 310 }, { v: 295 }, { v: 340 }, { v: 380 }, { v: 420 }, { v: 395 }, { v: 440 }, { v: 410 }, { v: 460 }, { v: 480 }, { v: 500 }], chartColor: "var(--color-chart-1)", footerKey: "totalEnergyFooter", sortOrder: 0 },
    { titleKey: "carbonEmission", value: "2,340", unit: "kg CO₂", delta: "+2%", deltaVariant: "up-bad" as const, chartType: "bar" as const, chartData: [{ v: 280 }, { v: 320 }, { v: 290 }, { v: 350 }, { v: 310 }, { v: 270 }, { v: 340 }], chartColor: "var(--color-chart-2)", footerKey: "carbonFooter", sortOrder: 1 },
    { titleKey: "energyIntensity", value: "98", unit: "kWh/m²", delta: "−7%", deltaVariant: "down-good" as const, chartType: "line" as const, chartData: [{ v: 120 }, { v: 115 }, { v: 112 }, { v: 108 }, { v: 105 }, { v: 103 }, { v: 100 }, { v: 99 }, { v: 97 }, { v: 96 }, { v: 97 }, { v: 98 }], chartColor: "var(--color-chart-1)", footerKey: "intensityFooter", sortOrder: 2 },
    { titleKey: "todayCost", value: "5,240", unit: "costUnit", delta: "+8%", deltaVariant: "up-bad" as const, chartType: "area" as const, chartData: [{ v: 180 }, { v: 210 }, { v: 195 }, { v: 240 }, { v: 280 }, { v: 310 }, { v: 290 }, { v: 330 }, { v: 350 }, { v: 370 }, { v: 385 }, { v: 400 }], chartColor: "var(--color-chart-4)", footerKey: "costFooter", sortOrder: 3 },
    { titleKey: "renewableRate", value: "85", unit: "%", delta: "renewableTarget", deltaVariant: "neutral" as const, chartType: "progress" as const, chartData: [{ v: 78 }, { v: 80 }, { v: 81 }, { v: 80 }, { v: 82 }, { v: 84 }, { v: 83 }, { v: 85 }, { v: 84 }, { v: 86 }, { v: 85 }, { v: 85 }], chartColor: "var(--color-cyber-green)", progressValue: 85, sortOrder: 4 },
    { titleKey: "loadStatus", value: "60", unit: "%", delta: "loadNormal", deltaVariant: "up-good" as const, chartType: "progress" as const, chartData: [{ v: 55 }, { v: 58 }, { v: 60 }, { v: 63 }, { v: 61 }, { v: 60 }, { v: 58 }, { v: 59 }, { v: 60 }, { v: 62 }, { v: 61 }, { v: 60 }], chartColor: "var(--color-chart-2)", progressValue: 60, sortOrder: 5 },
  ];
  await db.insert(schema.dashboardCards).values(cards);
  console.log(`Seeded ${cards.length} dashboard cards`);

  const breakdowns = [
    { category: "hvac", value: 45, color: "var(--color-chart-1)" },
    { category: "lighting", value: 30, color: "var(--color-chart-3)" },
    { category: "equipment", value: 15, color: "var(--color-chart-4)" },
    { category: "other", value: 10, color: "oklch(0.35 0.02 265)" },
  ];
  await db.insert(schema.energyBreakdowns).values(breakdowns);
  console.log(`Seeded ${breakdowns.length} energy breakdowns`);
}

async function seedIotTokens() {
  await db.insert(schema.iotTokens).values({
    accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTU4NjEwLCJkYXRhIjp7InVzZXJJZCI6bnVsbCwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc2NTY1ODEwfQ.y5w0z0ClwPhzKb0qqXqk_mF-3tIQp6GdB26a4E3gmH0",
    refreshToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTE1NzkxLCJkYXRhIjp7InVzZXJJZCI6ImFkbWluIiwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc5MTA3NzkxfQ.fg5BoJ7gbEkuQpVxrry8uKP73hoeZVO93F3LtjhSM5M",
    expiresAt: 1776565810000,
  });
  console.log("Seeded IoT token");
}

async function main() {
  console.log("Seeding database with mock data...");
  await clearTables();
  await seedUsers();
  await seedMaintenance();
  await seedFaults();
  await seedReports();
  await seedDashboard();
  await seedIotTokens();
  console.log("Done!");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
