// zh-CN.ts — 简体中文 UI 文字
// To add a new locale: copy this file, translate every string, then change the
// import in app/locales/index.ts.

export const zhCN = {
  // ── Meta ──────────────────────────────────────────────────────────────────
  meta: {
    title: "EcoCtrl 能源管理平台",
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

  // ── 设置页面 ────────────────────────────────────────────────────────────────
  settings: {
    title: "系统设置",
    subtitle: "自定义你的仪表盘体验",
    general: "通用",
    appearance: "外观",
    data: "数据控制",
    account: "账户",
    reset: "恢复默认",
    resetConfirm: "已恢复默认设置",
    autoRotate: "3D 建筑自动旋转",
    autoRotateDesc: "无人操作时建筑模型自动缓慢旋转",
    rotateSpeed: "旋转速度",
    showLabels: "显示区域标签",
    showLabelsDesc: "在 3D 模型上叠加展示楼层/区域名称",
    glowIntensity: "光晕强度",
    dataRefreshInterval: "数据刷新频率",
    navHideDelay: "导航自动隐藏",
    defaultCameraRadius: "默认视角距离",
    defaultRotationY: "默认水平旋转角度",
    seconds: "秒",
    degrees: "度",
    language: "界面语言",
    reducedMotion: "减少动态效果",
    reducedMotionDesc: "关闭不必要的动画以提升可访问性",
    bentoTitle: "仪表盘布局",
    bentoSubtitle: "自定义首页 Bento 网格排列与可见性",
    bentoEditLayout: "编辑布局",
    bentoResetLayout: "重置布局",
    bentoResetConfirm: "布局已重置为默认",
    autoSaving: "自动保存中…",
    saved: "已保存",
    save: "保存",
    syncDebounce: "自动保存延迟",
    syncDebounceDesc: "修改后自动同步到服务器的等待时间",
    editAutoExitDelay: "编辑模式自动退出",
    editAutoExitDelayDesc: "无操作一段时间后自动退出编辑模式",
    editAutoExitNever: "不自动退出",
  },

  // ── 编辑布局浮动工具栏 ──────────────────────────────────────────────────────
  editLayout: {
    done: "完成",
    cancel: "取消",
    reset: "还原",
  },

  // ── 三维建筑视图 ───────────────────────────────────────────────────────────
  building: {
    ariaLabel: "三维建筑能耗可视化",
    officeArea: "办公区",
    meetingArea: "会议区",
    dataCenter: "数据中心",
    exhibitionHall: "展示大厅",
    lobby: "大堂",
  },

  // ── 左侧统计卡片 ───────────────────────────────────────────────────────────
  cards: {
    noData: "无数据",
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

    loadStatus: "负载状态",
    loadNormal: "● 正常",
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
    noData: "无数据",
    trendTitle: "24 小时能耗趋势",
    trendTimeUnit: "时",
    breakdownTitle: "能耗分布",
    hvac: "暖通空调",
    lighting: "照明",
    equipment: "设备",
    other: "其他",
  },

  // ── 右侧面板 — 设备状态 ────────────────────────────────────────────────────
  devices: {
    title: "设备状态",
    airConditioning: "空调系统",
    lighting: "照明系统",
    elevators: "电梯",
    servers: "服务器",
  },

  // ── 右侧面板 — 实时告警 ────────────────────────────────────────────────────
  alerts: {
    title: "实时告警",
    activeSuffix: "条激活",
  },

  // ── 右侧面板 — AI 优化建议 ─────────────────────────────────────────────────
  ai: {
    title: "AI 优化建议",
  },
};

export type Locale = typeof zhCN;
