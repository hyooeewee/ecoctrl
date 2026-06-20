import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, count } from "drizzle-orm";
import { intro, isCancel, multiselect, outro } from "@clack/prompts";
import * as schema from "@/schemas/index";
import { ensureDatabase } from "@/lib/ensureDatabase";
import { migrateDatabase } from "@/lib/migrateDatabase";
import { ensureS3Buckets, getPetStorage, getPluginStorage } from "@/storage";
import type { PluginManifest } from "@/engine/plugin-types";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });

const ADMIN_USER = process.env.INIT_ADMIN_USERNAME?.trim() || "admin";
const ADMIN_PASS = process.env.INIT_ADMIN_PASSWORD?.trim() || "admin_secret";
const ADMIN_EMAIL = process.env.INIT_ADMIN_EMAIL?.trim() || "admin@example.com";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Module definitions ───────────────────────────────────────────

interface InitModule {
  value: string;
  label: string;
  forceable: boolean;
  prunable: boolean;
  run: (force: boolean, prune: boolean) => Promise<void>;
}

// ─── CLI parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterArg = args.find((a) => a.startsWith("--filter="));
const filteredModules = filterArg ? filterArg.slice(9).split(",") : null;
const force = args.includes("--force") || args.includes("-f");
const prune = args.includes("--prune");

if (force && prune) {
  console.error("[init] --force and --prune are mutually exclusive");
  process.exit(1);
}

// ─── Helper functions ─────────────────────────────────────────────

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function resolveAssetDir(scriptDir: string, subdir: string): Promise<string> {
  const candidates = [path.join(scriptDir, subdir), path.join(scriptDir, "../assets", subdir)];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return candidates[0];
}

// ─── Init functions ───────────────────────────────────────────────

async function initMigrate(_force: boolean, _prune: boolean) {
  console.log("[init] ensuring database exists...");
  await ensureDatabase();
  console.log("[init] running migrations...");
  await migrateDatabase();
  console.log("[init] migrations done");
}

async function initS3Buckets(_force: boolean, _prune: boolean) {
  if (process.env.STORAGE_PROVIDER !== "minio") {
    console.log("[init] storage provider is not minio, skipping S3 bucket init");
    return;
  }

  await ensureS3Buckets();
  console.log("[init] ensured S3 buckets");
}

async function initBuiltInNodes(force = false, prune = false) {
  const baseDir = await resolveAssetDir(__dirname, "built-in-nodes");

  const storage = getPluginStorage();

  if (prune) {
    const keys = await storage.list("");
    if (keys.length > 0) {
      console.log(`[init] prune: removing ${keys.length} plugin storage object(s)...`);
      for (const key of keys) {
        console.log(`[init] prune: deleting ${key}`);
        await storage.delete(key);
      }
    } else {
      console.log("[init] prune: plugin storage is already empty");
    }
  }

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

    if (dir.name !== manifest.id) {
      console.warn(
        `[init] built-in node folder "${dir.name}" does not match manifest.id "${manifest.id}", skipping`,
      );
      continue;
    }

    if (manifest.aliases && manifest.aliases.length > 0) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} provides aliases: ${manifest.aliases.join(", ")}`,
      );
    }

    const buildKey = (filename: string) => `${manifest.id}/${manifest.version}/${filename}`;

    const exists = await storage.exists(buildKey("manifest.json"));
    if (exists && !force) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} already seeded, skipping`,
      );
      continue;
    }

    if (exists && force) {
      console.log(
        `[init] built-in node ${manifest.id}@${manifest.version} already seeded, force overwriting`,
      );
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

    console.log(`[init] seeded built-in node ${manifest.id}@${manifest.version}`);
  }
}

async function initBuiltInPets(force = false, prune = false) {
  const builtInDir = await resolveAssetDir(__dirname, "built-in-pets");
  const storage = getPetStorage();

  if (prune) {
    const keys = await storage.list("");
    if (keys.length > 0) {
      console.log(`[init] prune: removing ${keys.length} pet storage object(s)...`);
      for (const key of keys) {
        console.log(`[init] prune: deleting ${key}`);
        await storage.delete(key);
      }
    } else {
      console.log("[init] prune: pet storage is already empty");
    }
  }

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

      const petJsonKey = `${dir.name}/pet.json`;
      const spritesheetKey = `${dir.name}/spritesheet.webp`;
      const petJsonExists = await storage.exists(petJsonKey);

      if (petJsonExists && !force) {
        console.log(`[init] built-in pet ${dir.name} already seeded, skipping`);
        continue;
      }

      if (petJsonExists && force) {
        console.log(`[init] built-in pet ${dir.name} already seeded, force overwriting`);
      }

      const petJsonBuffer = await fs.readFile(petJsonPath);
      const spritesheetBuffer = await fs.readFile(spritesheetPath);

      await storage.put(petJsonKey, petJsonBuffer, {
        contentType: "application/json",
        contentLength: petJsonBuffer.length,
      });
      await storage.put(spritesheetKey, spritesheetBuffer, {
        contentType: "image/webp",
        contentLength: spritesheetBuffer.length,
      });

      console.log(`[init] uploaded built-in pet: ${dir.name}`);
    }
  } catch {
    // assets/built-in-pets directory may not exist
  }
}

async function initUsers(force = false, _prune = false) {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, ADMIN_USER));

  if (existing.length > 0 && !force) {
    console.log(`[init] user "${ADMIN_USER}" already exists, skipping`);
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASS, 10);

  if (existing.length > 0 && force) {
    await db
      .update(schema.users)
      .set({
        password: hash,
        email: ADMIN_EMAIL,
        role: "super_admin",
        status: "online",
      })
      .where(eq(schema.users.username, ADMIN_USER));
    console.log(`[init] updated super_admin: ${ADMIN_USER}`);
  } else {
    await db.insert(schema.users).values({
      id: crypto.randomUUID(),
      username: ADMIN_USER,
      email: ADMIN_EMAIL,
      password: hash,
      role: "super_admin",
      status: "online",
    });
    console.log(`[init] created super_admin: ${ADMIN_USER} (${ADMIN_EMAIL})`);
  }

  if (!process.env.INIT_ADMIN_PASSWORD) {
    console.log(`[init] generated random password: ${ADMIN_PASS}`);
  }
}

async function initPlatformConfig(force = false, prune = false) {
  const existing = await db.select().from(schema.platformConfigs).limit(1);

  if (prune) {
    await db.delete(schema.platformConfigs);
    console.log("[init] prune: cleared platform_configs");
  } else if (existing.length > 0 && !force) {
    console.log("[init] platform_configs already seeded, skipping");
    return;
  }

  const values = {
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
      '# 角色定位\n你是蓝宝，是「中国国际展览中心(顺义馆)W馆室外多功能厅项目」的楼宇智能小助手，专注于楼宇智控与能源管理。你基于本项目专业知识，为用户提供准确、可靠的工程与运维解答。\n\n---\n\n# 建筑基本信息\n\n| 项目 | 内容 |\n|------|------|\n| 项目名称 | 中国国际展览中心(顺义馆)W馆室外多功能厅项目 |\n| 建设地点 | 北京市顺义区新国展顺义馆W1馆西侧 |\n| 建筑性质 | 单层民用公共建筑（临时建筑，使用期限24个月） |\n| 建筑主要功能 | 多功能厅、走廊、配套办公、配套办公、卫生间、附属配套用房等 |\n| 设计单位 | 北京市建筑设计研究院股份有限公司 |\n| 总承包单位/施工单位 | 中建-大成建筑有限责任公司 |\n| 总建筑面积 | 规划总用地面积11829.63㎡，5605.85㎡（全地上） |\n| 建筑高度 | 15.15m |\n| 外维护系统 | 铝岩棉夹心一体板幕墙系统+玻璃幕墙系统 |\n| 室内装修 | 精装修，多级石膏板吊顶、铝复合板内墙、地砖地面等 |\n| 结构形式 | 钢框架-支撑结构体系 |\n| 设计使用年限 | 5年 |\n| 抗震设防烈度 | 8度 |\n| 耐火等级 | 地上二级 |\n| 负荷等级 | 一级负荷用户 |\n| 防雷等级 | 二类防雷建筑物 |\n| 设备专业概况 | 本项目冷热源采用空气源热泵机组，多功能厅采用全空气空调系统，配套办公、走廊等采用风机盘管和新风空调系统。本项目设置生活给水系统、排水系统、雨水系统、消防水池及消防泵、室内消火栓系统及喷淋阀门井、自动喷水灭火系统、室外消火栓系统、室外雨水排水、雨水管网、市政给水引入管利用现状管网，污废水排至现状化粪池处理 |\n\n---\n\n# 功能分区\n\n- **中央多功能厅**：3000㎡（可容纳2100人），净高11m，可灵活分隔为5个厅室，中部1000㎡，其余各4间500㎡\n- **入口大厅/序厅**：南侧主入口，层高9.0m，序厅包含南侧、西侧、东侧序厅\n- **北侧**：配套办公、机房等配套用房，包含配电室、空调机房、设备泵房\n- **VIP室**：设有VIP室4间，东北角设置VIP室，VVIP室各一间（配有独立卫生间），配有备餐间1间；南侧序厅配置VIP室2间（配有独立卫生间），各配备餐间一间\n- **南侧**：配有公共卫生间2处，设有服务用房、更衣室、强弱电间、清洁间、工具间、空调机房等设施。\n\n---\n\n# 各专业系统知识库\n\n## 1. 暖通空调系统（HVAC）\n\n### 冷热源\n- 冷热源采用**空气源热泵机组**\n\n### 空调形式\n| 区域 | 系统形式 |\n|------|----------|\n| 多功能厅（3000㎡） | **全空气空调系统** |\n| 配套办公、走廊等 | **风机盘管 + 新风空调系统** |\n\n### 智控要点\n- 多功能厅大空间需根据人员密度（0.75人/㎡）调节新风量\n- 空调机房、风机房位于后勤区域，需与噪声敏感房间隔离\n- 设备机房墙面/顶棚需做吸声处理（NRC≥0.7）\n- 屋面排风机：采用**设备隔振 + 围挡隔声罩**降噪措施\n\n---\n\n## 2. 给排水系统\n\n### 给水\n- 生活给水系统，市政给水引入管利用**现状管网**\n\n### 排水\n- 污废水排至**现状化粪池**处理\n- 屋面雨水经**新建室外雨水沟**收集后排入市政雨水管道\n- 雨水沟容积最大可达**100m³**（暴雨期可作为临时蓄水区域）\n\n### 消防给水\n- 利用场馆**现状水泵房**\n- 室内消火栓系统、自动喷水灭火系统全覆盖\n- 每个消火栓下部设置手提式灭火器\n\n### 智控要点\n- 雨水沟液位监测（暴雨期蓄水预警）\n- 消防水池/水泵运行状态监控\n- 用水点房间（卫生间、空调机房、泵房）需监测漏水\n\n---\n\n## 3. 电气系统\n\n### 供配电\n- **一级负荷用户**\n- 进线间兼用值班室（地面抬高150mm，防水淹）\n- 柴油发电机房利用**场馆现状**\n\n### 防雷\n- **二类防雷建筑物**\n- 屋面避雷设施需定期检查\n\n### 智控要点\n- 一级负荷供电可靠性监控\n- 备用电源（柴油发电机）自动切换状态\n- 电气机房温湿度监测\n\n---\n\n## 4. 消防系统\n\n### 防火分区\n| 编号 | 面积 | 功能 | 排烟方式 |\n|------|------|------|----------|\n| 1F-01 | 734.15㎡ | 多功能厅配套用房 | 自然排烟 |\n| 1F-02 | 4800.71㎡ | 多功能厅 | 自然排烟 |\n\n### 消防设施\n- 自动喷水灭火系统：**全覆盖**\n- 消火栓系统：室内+室外\n- 灭火器：每处消火栓下部设手提式\n- 防烟分区：大空间采用挡烟垂壁（耐火极限0.5h）\n- **无机械排烟**，采用自然排烟窗（有效面积≥房间面积2%）\n\n### 疏散\n- 疏散宽度：多功能厅设计净宽**36.35m**\n- 疏散门净宽：人员密集场所≥1.4m\n- 消防救援口：净宽高≥1.0×1.0m，玻璃易破碎\n\n### 钢结构防火\n| 构件 | 耐火极限 | 防火涂料类型 | 厚度 |\n|------|----------|--------------|------|\n| 钢柱、防火分区边界钢梁 | 2.5h | 非膨胀型（厚型） | 26mm |\n| 钢梁、钢桁架 | 1.5h | 非膨胀型（厚型） | 19mm |\n| 屋顶承重构件 | 1.5h | 膨胀型（水性薄型） | 3.5mm |\n\n### 智控要点\n- 火灾自动报警系统联动\n- 自然排烟窗/电动排烟窗远程控制\n- 挡烟垂壁状态监测\n- 消防水泵/喷淋系统运行监控\n- 防火门启闭状态监测\n\n---\n\n## 5. 能源管理与节能\n\n### 能耗指标\n- 建筑类型：寒冷地区2B，甲二类公共建筑\n- 体形系数：**0.13**\n\n### 围护结构热工性能\n| 部位 | 传热系数K [W/(m²·K)] | 规范限值 |\n|------|----------------------|----------|\n| 混凝土屋面 | 0.32 | ≤0.38 |\n| 金属屋面 | 0.36 | ≤0.31（主断面） |\n| 外墙 | 0.456 | ≤0.475 |\n| 外窗/幕墙（南） | ≤1.9 | - |\n| 外窗/幕墙（北） | ≤2.5 | - |\n| 外窗/幕墙（东/西） | ≤2.4 | - |\n\n### 节能措施\n- 外墙外保温体系（岩棉板100mm）\n- 屋面保温（挤塑聚苯板90mm / 岩棉板100mm）\n- 外窗/幕墙采用Low-E中空钢化玻璃\n- 外窗气密性≥7级，幕墙气密性≥3级\n- 绿色建材应用比例≥50%\n- 室内空气污染物浓度比国标降低20%\n\n### 能源管理智控要点\n- 空调系统分区计量（多功能厅全空气系统 vs 办公区风机盘管）\n- 空气源热泵COP监测\n- 照明分区控制（配合自然采光）\n- 能耗分项计量（暖通、照明、动力、特殊用电）\n\n---\n\n## 6. 声环境管理\n\n### 噪声限值\n| 区域 | 允许噪声级 |\n|------|------------|\n| VIP室 | ≤40dB(A) |\n| 多功能厅 | ≤40dB(A) |\n\n### 隔声标准\n- 外墙：Rw+Ctr ≥48dB\n- 外窗/幕墙：Rw+Ctr ≥28dB（交通干线侧≥33dB）\n- 多功能厅隔墙：Rw+C ≥50dB\n- 机房门：Rw+Ctr ≥35dB（开向公共区域≥40dB）\n\n### 室内音质\n- 多功能厅混响时间：≤1.8s（80%满场，中频500-1000Hz）\n- VIP室混响时间：≤1.4s\n\n\n---\n\n## 7. 幕墙与外围护\n\n### 玻璃幕墙（南侧为主）\n- 精致钢龙骨，TP12（双银Low-E）+12Ar+TP12（无银Low-E）超白中空钢化玻璃（暖边）\n- 传热系数≤1.9 W/(m²·K)，隔声≥45dB\n- 开启扇：电动上悬外开，多点锁\n\n### 金属幕墙（东西北立面）\n- 3mm氟碳喷涂铝单板，热镀锌钢龙骨\n\n### 金属屋面\n- 直立锁边彩钢板屋面\n- 隔声量≥45dB，需具备降雨噪音隔绝性能\n\n### 智控要点\n- 电动排烟窗/开启扇远程控制（消防联动）\n- 幕墙气密性定期检测\n- 屋面渗漏监测\n\n---\n\n## 8. 无障碍设施\n\n- 主出入口：**平坡出入口**（坡度≥1:20）\n- 无障碍卫生间：1组（面积≥4㎡），含无障碍坐便器、洗手盆、救助呼叫装置\n- 轮椅席位：多功能厅西南角\n- 盲道：连接场地主要出入口与建筑主要人行出入口\n- 低位服务设施：问询台、接待处、饮水机\n\n---\n\n## 9. 雨水控制与海绵城市\n\n- 室外地面雨水排水利用**现状雨水设施**\n- 透水铺装和硬化地面范围与建设前保持一致\n- 场地纵坡≥0.2%，道路纵坡≥0.3%，横坡≥1%\n- 雨水沟低于室外地坪，暴雨期可作为临时蓄水区\n\n---\n\n# 回答规范\n\n1. **准确性优先**：所有回答必须基于本工程实际设计参数，不得臆测\n2. **专业术语**：使用标准工程术语，必要时解释缩写\n3. **数据引用**：涉及规范限值时，同时给出设计值和规范值\n4. **安全提示**：涉及消防、结构安全的问题，必须强调"以现场实际和最新规范为准"\n5. **临时建筑特性**：提醒用户本建筑为临时建筑（设计使用年限5年，使用期限24个月），部分系统利用现状场馆设施\n6. **不确定时**：明确告知"该信息未在施工图设计说明中明确，建议咨询设计单位或查阅专项深化图纸"\n7. **语言风格**：回答时，简洁、专业、友好。原则上使用中文回答，除非用户明确要求语言或是使用非中文交流。\n\n---\n\n# 禁止事项\n\n- 不得提供涉及结构安全计算的修改建议\n- 不得替代专业工程师的现场判断\n- 不得泄露设计单位知识产权相关的专有技术做法\n- 不得对未在文档中明确的内容进行猜测性回答\n- 不得透露你的模型名和开发者，统一使用你的角色定位',
  };

  if (existing.length > 0 && force) {
    await db
      .update(schema.platformConfigs)
      .set(values)
      .where(eq(schema.platformConfigs.id, existing[0].id));
    console.log("[init] updated platform config");
  } else {
    await db.insert(schema.platformConfigs).values(values);
    console.log("[init] created default platform config");
  }
}

async function initDashboardWidgets(force = false, prune = false) {
  const existing = await db.select({ value: count() }).from(schema.dashboardWidgets);
  if (prune) {
    await db.delete(schema.dashboardWidgets);
    console.log("[init] prune: cleared dashboard widgets");
  } else if (existing[0].value > 0 && !force) {
    console.log("[init] dashboard widgets already seeded, skipping");
    return;
  }

  const widgets = [
    {
      metricKey: "energy-total",
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
      metricKey: "energy-cost",
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
      metricKey: "carbon-emission",
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
      metricKey: "energy-intensity",
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
      metricKey: "load-status",
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
      metricKey: "renewable-rate",
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
      metricKey: "weather",
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
      metricKey: "energy-chart",
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
      metricKey: "energy-breakdown",
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
      metricKey: "alerts-list",
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
      metricKey: "devices-status",
      icon: "Monitor",
      layoutX: 14,
      layoutY: 5,
      layoutW: 3,
      layoutH: 2,
      hidden: false,
      dataType: "list" as const,
      dataJson: {
        items: [
          { icon: "Lightbulb", label: "智能照明", value: 54, status: "ok" },
          { icon: "Thermometer", label: "空调面板", value: 39, status: "ok" },
          { icon: "Wind", label: "空调设备AHU", value: 3, status: "ok" },
          { icon: "Fan", label: "新风PAU", value: 4, status: "ok" },
          { icon: "Snowflake", label: "风冷热泵", value: 12, status: "ok" },
          { icon: "Droplets", label: "智能水表", value: 1, status: "ok" },
          { icon: "Server", label: "服务器", value: 2, status: "ok" },
        ],
      },
      sortOrder: 10,
    },
    {
      metricKey: "ai-suggestions",
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

  if (existing[0].value > 0 && force && !prune) {
    await db.delete(schema.dashboardWidgets);
    console.log("[init] cleared existing dashboard widgets (force mode)");
  }

  await db.insert(schema.dashboardWidgets).values(widgets);
  console.log("[init] seeded dashboard widgets");
}

// ─── Module registry ──────────────────────────────────────────────

const MODULES: InitModule[] = [
  {
    value: "migrate",
    label: "数据库迁移 (migrate)",
    forceable: false,
    prunable: false,
    run: initMigrate,
  },
  {
    value: "buckets",
    label: "S3 存储桶 (buckets)",
    forceable: false,
    prunable: false,
    run: initS3Buckets,
  },
  {
    value: "nodes",
    label: "内置工作流节点 (nodes)",
    forceable: true,
    prunable: true,
    run: initBuiltInNodes,
  },
  {
    value: "pets",
    label: "内置宠物 (pets)",
    forceable: true,
    prunable: true,
    run: initBuiltInPets,
  },
  { value: "users", label: "默认管理员 (users)", forceable: true, prunable: false, run: initUsers },
  {
    value: "config",
    label: "平台配置 (config)",
    forceable: true,
    prunable: true,
    run: initPlatformConfig,
  },
  {
    value: "widgets",
    label: "Dashboard 组件 (widgets)",
    forceable: true,
    prunable: true,
    run: initDashboardWidgets,
  },
];

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  intro("ecoctrl db:init");

  if (force) {
    console.log("[init] --force flag set, will overwrite existing data where applicable");
  }
  if (prune) {
    console.log("[init] --prune flag set, will clear existing data before seeding");
  }

  // Select modules
  let selected: string[];
  if (filteredModules) {
    const valid = MODULES.map((m) => m.value);
    const invalid = filteredModules.filter((m) => !valid.includes(m));
    if (invalid.length > 0) {
      console.error(`[init] unknown modules: ${invalid.join(", ")}`);
      console.error(`[init] valid modules: ${valid.join(", ")}`);
      process.exit(1);
    }
    selected = filteredModules;
  } else if (process.stdin.isTTY) {
    const result = await multiselect({
      message: "Select modules to initialize (space toggle, 'a' all, enter confirm):",
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

  if (prune) {
    const unprunable = selected
      .map((s) => MODULES.find((m) => m.value === s)!)
      .filter((m) => !m.prunable)
      .map((m) => m.value);
    if (unprunable.length > 0) {
      console.error(`[init] --prune is not supported for modules: ${unprunable.join(", ")}`);
      process.exit(1);
    }
  }

  console.log(`[init] selected modules: ${selected.join(", ")}`);

  // Execute in order
  for (const mod of MODULES) {
    if (!selected.includes(mod.value)) continue;
    try {
      const shouldForce = force && mod.forceable;
      const shouldPrune = prune && mod.prunable;
      await mod.run(shouldForce, shouldPrune);
    } catch (err) {
      console.error(`[init] failed at module "${mod.value}":`, err);
      process.exit(1);
    }
  }

  await client.end();
  outro("[init] done");
}

main().catch((err) => {
  console.error("[init] failed:", err);
  process.exit(1);
});
