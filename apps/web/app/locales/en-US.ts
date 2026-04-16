export const enUS = {
  // ── Meta ──────────────────────────────────────────────────────────────────
  meta: {
    title: "ECOCTRL Smart Control — Energy Management Platform",
    description: "Enterprise-grade 3D energy management platform",
  },

  // ── Common ─────────────────────────────────────────────────────────────────
  common: {
    loading: "Loading model…",
    logoAlt: "Logo",
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    brandSub: "Smart Control",
    tagline: "Enterprise-grade 3D energy management platform",
    toggleNavShow: "Show navigation",
    toggleNavHide: "Hide navigation",
    location: "Exhibition Center Overall",
    monitoring: "Energy Monitoring",
  },

  // ── Bottom Navigation ──────────────────────────────────────────────────────
  nav: {
    overview: "Overview",
    floors: "Floors",
    systems: "Systems",
    analysis: "Analysis",
    settings: "Settings",
  },

  // ── Settings Page ──────────────────────────────────────────────────────────
  settings: {
    title: "System Settings",
    subtitle: "Customize your dashboard experience",
    general: "General",
    appearance: "Appearance",
    data: "Data Control",
    account: "Account",
    reset: "Reset to Default",
    resetConfirm: "Settings restored to default",
    autoRotate: "3D Building Auto-Rotate",
    autoRotateDesc: "Automatically rotate the building when idle",
    rotateSpeed: "Rotation Speed",
    showLabels: "Show Area Labels",
    showLabelsDesc: "Overlay floor/area names on the 3D model",
    glowIntensity: "Glow Intensity",
    dataRefreshInterval: "Data Refresh Interval",
    navHideDelay: "Nav Auto-Hide",
    seconds: "s",
    language: "Language",
    reducedMotion: "Reduce Motion",
    reducedMotionDesc: "Disable unnecessary animations for accessibility",
  },

  // ── 3D Building View ───────────────────────────────────────────────────────
  building: {
    ariaLabel: "3D building energy consumption visualization",
    officeArea: "Office Area",
    meetingArea: "Meeting Area",
    dataCenter: "Data Center",
    exhibitionHall: "Exhibition Hall",
    lobby: "Lobby",
    viewOverview: "Overview",
    viewTop: "Top",
    viewFront: "Front",
    viewSide: "Side",
  },

  // ── Left Stat Cards ────────────────────────────────────────────────────────
  cards: {
    totalEnergy: "Today's Total Power",
    totalEnergyFooter: "24h cumulative usage",

    carbonEmission: "Today's Carbon Emission",
    carbonFooter: "7-day comparison trend",

    energyIntensity: "Energy Intensity",
    intensityFooter: "Continuous decline trend ↓",

    todayCost: "Today's Electricity Cost",
    costUnit: "CNY",
    costFooter: "Compared to yesterday baseline",

    renewableRate: "Renewable Energy Ratio",
    renewableTarget: "Target: 90%",

    loadStatus: "Load Status",
    loadNormal: "● Normal",
  },

  // ── Control Buttons ────────────────────────────────────────────────────────
  controls: {
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit Fullscreen",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    reset: "Reset",
  },

  // ── Error Page ─────────────────────────────────────────────────────────────
  errors: {
    notFoundTitle: "Page Not Found",
    notFoundDesc: "The path you visited does not exist, please check the URL",
    autoRedirect: "Auto redirect",
    redirectNow: "Return Now",
    unexpected: "An unexpected error occurred",
  },

  // ── Bottom Charts ──────────────────────────────────────────────────────────
  charts: {
    trendTitle: "24h Energy Trend",
    trendTimeUnit: "h",
    breakdownTitle: "Energy Breakdown",
    hvac: "HVAC",
    lighting: "Lighting",
    equipment: "Equipment",
    other: "Other",
  },

  // ── Right Panel — Device Status ────────────────────────────────────────────
  devices: {
    title: "Device Status",
    total: "43 Total",
    airConditioning: "Air Conditioning",
    lighting: "Lighting System",
    elevators: "Elevators",
    servers: "Servers",
  },

  // ── Right Panel — Real-time Alerts ─────────────────────────────────────────
  alerts: {
    title: "Real-time Alerts",
    active: "8 Active",
    serverTempTitle: "Server Room Temp High",
    serverTempSub: "T3 Room temperature exceeded",
    hvacWarnTitle: "HVAC Unit 3 Alert",
    hvacWarnSub: "HVAC Unit 2 abnormal",
    powerSurgeTitle: "Power Surge Detected",
    powerSurgeSub: "Surge event detected",
    upsBatteryTitle: "UPS Battery Low",
    upsBatterySub: "Backup power remaining 18%",
  },

  // ── Right Panel — AI Optimization Suggestions ──────────────────────────────
  ai: {
    title: "AI Optimization",
    hvacText: "Optimize HVAC night schedule—lower night temp to 18°C",
    hvacSaving: "Estimated energy saving 12%",
    lightingText: "Adjust lighting based on occupancy sensors—B2–B4 areas",
    lightingSaving: "Estimated energy saving 8%",
    serverText: "Migrate non-critical server tasks to off-peak hours (02:00–06:00)",
    serverSaving: "Estimated cost saving 5%",
  },
};
