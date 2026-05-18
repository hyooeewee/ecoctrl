import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { count } from "drizzle-orm";
import * as schema from "@/schemas/index";
import { ensureDatabase } from "@/lib/ensureDatabase";
import { migrateDatabase } from "@/lib/migrateDatabase";
import { ensureS3Buckets, getPetStorage, getPluginStorage } from "@/storage";
import type { PluginManifest } from "@/engine/plugin-types";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const ADMIN_USER = process.env.INIT_ADMIN_USERNAME?.trim() || "admin";
const ADMIN_PASS = process.env.INIT_ADMIN_PASSWORD?.trim() || crypto.randomUUID();
const ADMIN_EMAIL = process.env.INIT_ADMIN_EMAIL?.trim() || "admin@example.com";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initS3Buckets() {
  if (process.env.STORAGE_PROVIDER !== "minio") {
    console.log("[init] storage provider is not minio, skipping S3 bucket init");
    return;
  }

  await ensureS3Buckets();
  console.log(`[init] ensured S3 buckets`);
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveAssetDir(scriptDir: string, subdir: string): Promise<string> {
  const candidates = [
    path.join(scriptDir, subdir),              // prod (Docker): /app/built-in-pets
    path.join(scriptDir, "../assets", subdir),  // dev (tsx): scripts/../assets/built-in-pets
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return candidates[0]; // fallback to first, let the caller fail with a clear error
}

async function initBuiltInNodes() {
  const baseDir = await resolveAssetDir(__dirname, "built-in-nodes");

  const storage = getPluginStorage();
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const pluginDirs = entries.filter((e) => e.isDirectory());

  for (const dir of pluginDirs) {
    const pluginDir = path.join(baseDir, dir.name);
    const manifestPath = path.join(pluginDir, "manifest.json");

    if (!(await fileExists(manifestPath))) {
      console.warn(`[init] built-in node "${dir.name}" missing manifest.json, skipping`);
      continue;
    }

    const manifestRaw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw) as PluginManifest;
    const buildKey = (filename: string) => `${manifest.id}/${manifest.version}/${filename}`;

    if (await storage.exists(buildKey("manifest.json"))) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} already seeded, skipping`,
      );
      continue;
    }

    await storage.put(buildKey("manifest.json"), Buffer.from(manifestRaw));
    await storage.put(
      buildKey(manifest.entry),
      await fs.readFile(path.join(pluginDir, manifest.entry)),
    );
    await storage.put(
      buildKey(manifest.schema),
      await fs.readFile(path.join(pluginDir, manifest.schema)),
    );

    if (manifest.icon) {
      const iconPath = path.join(pluginDir, manifest.icon);
      if (await fileExists(iconPath)) {
        await storage.put(buildKey(manifest.icon), await fs.readFile(iconPath));
      }
    }

    console.log(`[init] seeded built-in nodes ${manifest.id}@${manifest.version}`);
  }
}

async function initUsers() {
  const [{ value }] = await db.select({ value: count() }).from(schema.users);
  if (value > 0) {
    console.log("[init] users already seeded, skipping");
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    username: ADMIN_USER,
    email: ADMIN_EMAIL,
    password: hash,
    role: "super_admin",
    status: "online",
  });

  console.log(`[init] created super_admin: ${ADMIN_USER} (${ADMIN_EMAIL})`);
  if (!process.env.INIT_ADMIN_PASSWORD) {
    console.log(`[init] generated random password: ${ADMIN_PASS}`);
  }
}

async function initPlatformConfig() {
  const [{ value }] = await db.select({ value: count() }).from(schema.platformConfigs);
  if (value > 0) {
    console.log("[init] platform_configs already seeded, skipping");
    return;
  }

  await db.insert(schema.platformConfigs).values({
    platformName: "EcoCtrl 能管平台",
    refreshInterval: 30,
    realtimeAlertEnabled: true,
    timezone: "Asia/Shanghai",
    autoBackup: true,
    backupRetentionDays: 30,
    sessionTimeout: 30,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: false,
    allowRegistration: false,
    allowPasswordReset: false,
    allowOAuthLogin: false,
    systemPrompt:
      "你是蓝宝，EcoCtrl 能源管理平台的智能助手。\n\n平台能力：\n\n- 三维建筑能耗可视化（BabylonJS）\n- 实时监控暖通空调、照明、电梯、服务器等设备状态\n- 能耗数据分析与 AI 优化建议\n- 实时告警管理\n\n回复风格：\n\n- 使用中文回复\n- 简洁、专业、友好\n- 需要调用工具时直接调用，不要告知用户你在调用工具\n- 对于不确定的问题，坦诚说明不要编造",
  });

  console.log("[init] created default platform config");
}

async function initDashboardData() {
  const [{ value: energyCount }] = await db.select({ value: count() }).from(schema.energyReadings);
  if (energyCount === 0) {
    await db.insert(schema.energyReadings).values([
      { hour: "Mon", kWh: 400 },
      { hour: "Tue", kWh: 300 },
      { hour: "Wed", kWh: 500 },
      { hour: "Thu", kWh: 280 },
      { hour: "Fri", kWh: 590 },
      { hour: "Sat", kWh: 320 },
      { hour: "Sun", kWh: 250 },
    ]);
    console.log("[init] created energy readings");
  }

  const [{ value: alertCount }] = await db.select({ value: count() }).from(schema.alerts);
  if (alertCount === 0) {
    await db.insert(schema.alerts).values([
      {
        id: crypto.randomUUID(),
        device: "中央空调 A1",
        level: "high",
        message: "能耗异常波动 (超出阈值 20%)",
        time: "10:15:22",
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        device: "配电柜 B3",
        level: "medium",
        message: "电压不稳定告警",
        time: "09:45:10",
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        device: "水泵 C1",
        level: "low",
        message: "例行维保提醒",
        time: "08:00:00",
        status: "resolved",
      },
      {
        id: crypto.randomUUID(),
        device: "电梯 #4",
        level: "high",
        message: "传感器故障",
        time: "11:20:05",
        status: "pending",
      },
      {
        id: crypto.randomUUID(),
        device: "照明控制系统",
        level: "medium",
        message: "通讯中断",
        time: "10:55:30",
        status: "resolved",
      },
    ]);
    console.log("[init] created alerts");
  }
}

async function initDashboardWidgets() {
  const [{ value }] = await db.select({ value: count() }).from(schema.dashboardWidgets);
  if (value > 0) {
    console.log("[init] dashboard_widgets already seeded, skipping");
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
  console.log("[init] created dashboard widgets");
}

async function initDashboardModel() {
  const [{ value }] = await db.select({ value: count() }).from(schema.dashboardModels);
  if (value > 0) {
    console.log("[init] dashboard_models already seeded, skipping");
    return;
  }

  await db.insert(schema.dashboardModels).values({
    modelFileUrl: null,
    cameraPreset: "Default_View_01",
    ambientLightIntensity: 0.85,
    hotspots: [],
    labels: [],
  });

  console.log("[init] created dashboard model config");
}

async function initEnergyAreas() {
  const [{ value }] = await db.select({ value: count() }).from(schema.energyAreas);
  if (value > 0) {
    console.log("[init] energy_areas already seeded, skipping");
    return;
  }

  await db.insert(schema.energyAreas).values([
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
  ]);

  console.log("[init] created energy areas");
}

async function initBackupSchedule() {
  const [{ value }] = await db.select({ value: count() }).from(schema.backupSchedules);
  if (value > 0) {
    console.log("[init] backup_schedules already seeded, skipping");
    return;
  }

  await db.insert(schema.backupSchedules).values({ nextBackup: "2023-11-20 03:00" });
  console.log("[init] created backup schedule");
}

async function initIotTokens() {
  const [{ value }] = await db.select({ value: count() }).from(schema.iotTokens);
  if (value > 0) {
    console.log("[init] iot_tokens already seeded, skipping");
    return;
  }

  await db.insert(schema.iotTokens).values({
    accessToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTU4NjEwLCJkYXRhIjp7InVzZXJJZCI6bnVsbCwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc2NTY1ODEwfQ.y5w0z0ClwPhzKb0qqXqk_mF-3tIQp6GdB26a4E3gmH0",
    refreshToken:
      "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ3ZWJ0YWxrIiwiYXVkIjoiY2xpZW50IiwiaWF0IjoxNzc2NTE1NzkxLCJkYXRhIjp7InVzZXJJZCI6ImFkbWluIiwiYXBwSWQiOiJhcHBpZHRlc3QwMDEifSwiZXhwIjoxNzc5MTA3NzkxfQ.fg5BoJ7gbEkuQpVxrry8uKP73hoeZVO93F3LtjhSM5M",
    expiresAt: 1776565810000,
  });

  console.log("[init] created IoT token");
}

async function initBuiltInPets() {
  const builtInDir = await resolveAssetDir(__dirname, "built-in-pets");
  const storage = getPetStorage();

  try {
    const entries = await fs.readdir(builtInDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    for (const dir of dirs) {
      const petDir = path.join(builtInDir, dir.name);
      const petJsonPath = path.join(petDir, "pet.json");
      const spritesheetPath = path.join(petDir, "spritesheet.webp");

      try {
        await fs.access(petJsonPath);
        await fs.access(spritesheetPath);
      } catch {
        console.warn(`[init] built-in pet ${dir.name} missing files, skipping`);
        continue;
      }

      const exists = await storage.exists(`${dir.name}/pet.json`);
      if (exists) {
        continue;
      }

      const petJsonBuffer = await fs.readFile(petJsonPath);
      const spritesheetBuffer = await fs.readFile(spritesheetPath);

      await storage.put(`${dir.name}/pet.json`, petJsonBuffer, {
        contentType: "application/json",
        contentLength: petJsonBuffer.length,
      });
      await storage.put(`${dir.name}/spritesheet.webp`, spritesheetBuffer, {
        contentType: "image/webp",
        contentLength: spritesheetBuffer.length,
      });

      console.log(`[init] uploaded built-in pet: ${dir.name}`);
    }
  } catch {
    // assets/built-in-pets directory may not exist
  }
}

async function main() {
  console.log("[init] ensuring database exists...");
  await ensureDatabase();
  console.log("[init] running migrations...");
  await migrateDatabase();
  console.log("[init] migrations done");

  console.log("[init] checking database state...");
  await initS3Buckets();
  await initBuiltInNodes();
  await initBuiltInPets();
  await initUsers();
  await initPlatformConfig();
  await initDashboardData();
  await initDashboardWidgets();
  await initDashboardModel();
  await initEnergyAreas();
  await initBackupSchedule();
  await initIotTokens();
  await client.end();
  console.log("[init] done");
}

main().catch((err) => {
  console.error("[init] failed:", err);
  process.exit(1);
});
