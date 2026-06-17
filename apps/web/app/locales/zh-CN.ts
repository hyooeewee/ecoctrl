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
    openSettings: "打开设置",
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
    showLoadingAnimation: "显示加载动画",
    showLoadingAnimationDesc: "3D 模型加载时展示蓝图撕纸动画",
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
    // Pet
    petTheme: "宠物形象",
    petThemeDesc: "选择桌面宠物的外观",
    voiceEnabled: "语音播报",
    voiceEnabledDesc: "AI 回复时自动朗读",
    voiceSpeed: "语速",
    // Account / Login
    loginEmail: "邮箱地址",
    loginPassword: "密码",
    loginButton: "登录",
    loginSuccess: "登录成功",
    loginError: "登录失败，请检查邮箱和密码",
    logoutButton: "退出登录",
    logoutSuccess: "已退出登录",
    logoutConfirmTitle: "确认退出登录",
    logoutConfirmDesc: "退出后将清除当前会话，是否继续？",
    logoutConfirm: "确认退出",
    logoutCancel: "取消",
    roleLabel: "角色",
    pleaseEnterEmail: "请输入邮箱",
    pleaseEnterPassword: "请输入密码",
  },

  // ── 编辑布局浮动工具栏 ──────────────────────────────────────────────────────
  editLayout: {
    done: "完成",
    cancel: "取消",
    reset: "还原",
  },

  // ── 宠物聊天 ───────────────────────────────────────────────────────────────
  pet: {
    inputPlaceholder: "输入消息...",
    voiceInput: "按住说话",
    voiceInputActive: "松开结束",
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

  // ── 天气 Widget ────────────────────────────────────────────────────────────
  weather: {
    title: "天气",
  },

  // ── 标签介绍面板 ───────────────────────────────────────────────────────────
  labelInfo: {
    office1: {
      title: "办公区 A",
      description:
        "大楼西侧的主要办公区域，约有 120 个工位，配备智能照明和暖通空调自动化系统。日均能耗约 340 kWh。",
    },
    meeting: {
      title: "会议区",
      description:
        "中央会议区域，设有 6 间会议室和 2 间董事会会议室。配备智能 occupancy 传感器和自动百叶窗。日均能耗约 180 kWh。",
    },
    dataCenter: {
      title: "数据中心",
      description:
        "大楼的 IT 基础设施中心，包含 8 台服务器机架和冗余冷却系统。温度维持在 22±1°C。配备 UPS 后备电源和精密空调。日均能耗约 520 kWh。",
    },
    exhibition: {
      title: "展示大厅",
      description:
        "宽敞的展示区域，配备动态照明系统和数字标牌。用于产品展示和客户演示。日均能耗约 260 kWh。",
    },
    office2: {
      title: "办公区 B",
      description:
        "东侧翼办公区域，有 95 个工位。采用开放式布局，配备分区气候控制和日光采集系统。日均能耗约 290 kWh。",
    },
    lobby: {
      title: "大堂",
      description:
        "主入口和接待区域，挑高设计，充分利用自然采光。配备智能玻璃幕墙和访客流量监测。日均能耗约 110 kWh。",
    },
  },
};

export type Locale = typeof zhCN;
