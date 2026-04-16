// zh-CN.ts — 简体中文 UI 文字
// To add a new locale: copy this file, translate every string, then change the
// import in app/locales/index.ts.

export const zhCN = {
  // ── Meta ──────────────────────────────────────────────────────────────────
  meta: {
    title: "ECOCTRL 智慧精控 — 能源管理平台",
    description: "企业级三维能源管理平台",
  },

  // ── 通用 ──────────────────────────────────────────────────────────────────
  common: {
    loading: "加载模型中…",
    logoAlt: "Logo",
  },

  // ── 头部 ──────────────────────────────────────────────────────────────────
  header: {
    brandSub: "智慧精控",
    pageTitle: "ECOCTRL 智慧精控",
    tagline: "企业级三维能源管理平台",
    toggleNavShow: "显示导航",
    toggleNavHide: "隐藏导航",
    location: "会展中心整体",
    monitoring: "能源监控",
  },

  // ── 底部导航 ───────────────────────────────────────────────────────────────
  nav: {
    overview: "总览",
    floors: "楼层",
    systems: "系统",
    analysis: "分析",
    settings: "设置",
  },

  // ── 三维建筑视图 ───────────────────────────────────────────────────────────
  building: {
    ariaLabel: "三维建筑能耗可视化",
    officeArea: "办公区",
    meetingArea: "会议区",
    dataCenter: "数据中心",
    exhibitionHall: "展示大厅",
    lobby: "大堂",
    viewOverview: "总览",
    viewTop: "俯视",
    viewFront: "正面",
    viewSide: "侧面",
  },

  // ── 左侧统计卡片 ───────────────────────────────────────────────────────────
  cards: {
    totalEnergy: "今日总用电",
    totalEnergyFooter: "24 小时累计用量",

    carbonEmission: "今日碳排放",
    carbonFooter: "7 天对比趋势",

    energyIntensity: "能耗强度",
    intensityFooter: "持续下降趋势 ↓",

    todayCost: "今日电费",
    costUnit: "元",
    costFooter: "对比昨日基准",

    renewableRate: "可再生能源占比",
    renewableTarget: "目标：90%",
    renewableFooter: "本月清洁能源份额",

    loadStatus: "负载状态",
    loadNormal: "● 正常",
    loadFooter: "系统负载在正常范围内",
  },

  // ── 控制按钮 ───────────────────────────────────────────────────────────────
  controls: {
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    zoomIn: "放大",
    zoomOut: "缩小",
    reset: "还原",
  },

  // ── 错误页面 ───────────────────────────────────────────────────────────────
  errors: {
    notFoundTitle: "页面未找到",
    notFoundDesc: "您访问的路径不存在，请检查 URL 是否正确",
    autoRedirect: "自动返回首页",
    redirectNow: "立即返回",
    unexpected: "发生未知错误",
  },

  // ── 底部图表 ───────────────────────────────────────────────────────────────
  charts: {
    trendTitle: "24 小时能耗趋势",
    trendTimeUnit: "时", // used in tooltip: "08时  420 kWh"
    breakdownTitle: "能耗分布",
    hvac: "暖通空调",
    lighting: "照明",
    equipment: "设备",
    other: "其他",
  },

  // ── 右侧面板 — 设备状态 ────────────────────────────────────────────────────
  devices: {
    title: "设备状态",
    total: "共 43 台",
    airConditioning: "空调系统",
    lighting: "照明系统",
    elevators: "电梯",
    servers: "服务器",
  },

  // ── 右侧面板 — 实时告警 ────────────────────────────────────────────────────
  alerts: {
    title: "实时告警",
    active: "8 条激活",
    serverTempTitle: "机房温度过高",
    serverTempSub: "T3 机房温度超限",
    hvacWarnTitle: "暖通 3 号机组告警",
    hvacWarnSub: "暖通 2 号机组异常",
    powerSurgeTitle: "检测到电涌",
    powerSurgeSub: "电涌事件已检测",
    upsBatteryTitle: "UPS 电量不足",
    upsBatterySub: "备用电源剩余 18%",
  },

  // ── 右侧面板 — AI 优化建议 ─────────────────────────────────────────────────
  ai: {
    title: "AI 优化建议",
    hvacText: "优化暖通夜间计划——降低夜间温控设定值至 18°C",
    hvacSaving: "预计节能 12%",
    lightingText: "根据占用传感器调整照明——B2–B4 区域",
    lightingSaving: "预计节能 8%",
    serverText: "将非关键服务器任务迁移至低峰期 (02:00–06:00)",
    serverSaving: "预计节省 5% 费用",
  },

  // ── 通用 UI 组件 ───────────────────────────────────────────────────────────
  ui: {
    paginationPrevious: "上一页",
    paginationNext: "下一页",
    paginationPreviousAria: "转到上一页",
    paginationNextAria: "转到下一页",
    paginationMorePages: "更多页面",
    spinnerLoading: "加载中",
    sidebarToggle: "切换侧边栏",
    commandTitle: "命令面板",
    commandDescription: "搜索要运行的命令…",
  },
};

export type Locale = typeof zhCN;
