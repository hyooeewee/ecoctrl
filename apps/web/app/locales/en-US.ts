export const enUS = {
  // ── Meta ──────────────────────────────────────────────────────────────────
  meta: {
    title: "EcoCtrl Energy Management Platform",
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
    openSettings: "Open settings",
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
    defaultCameraRadius: "Default Camera Distance",
    defaultRotationY: "Default Horizontal Rotation",
    seconds: "s",
    degrees: "°",
    language: "Language",
    reducedMotion: "Reduce Motion",
    reducedMotionDesc: "Disable unnecessary animations for accessibility",
    showLoadingAnimation: "Show Loading Animation",
    showLoadingAnimationDesc: "Display the blueprint peel-off animation while the 3D model loads",
    bentoTitle: "Dashboard Layout",
    bentoSubtitle: "Customize homepage Bento grid arrangement and visibility",
    bentoEditLayout: "Edit Layout",
    bentoResetLayout: "Reset Layout",
    bentoResetConfirm: "Layout reset to default",
    autoSaving: "Auto-saving…",
    saved: "Saved",
    save: "Save",
    syncDebounce: "Auto-save Delay",
    syncDebounceDesc: "Wait time before auto-syncing changes to server",
    editAutoExitDelay: "Edit Mode Auto-Exit",
    editAutoExitDelayDesc: "Automatically exit edit mode after a period of inactivity",
    editAutoExitNever: "Never",
    // Pet
    petTheme: "Pet Appearance",
    petThemeDesc: "Choose your desktop pet look",
    voiceEnabled: "Voice Announcement",
    voiceEnabledDesc: "Auto-read AI replies aloud",
    voiceSpeed: "Voice Speed",
    // Account / Login
    loginEmail: "Email Address",
    loginPassword: "Password",
    loginButton: "Sign In",
    loginSuccess: "Signed in successfully",
    loginError: "Sign in failed, please check your email and password",
    logoutButton: "Sign Out",
    logoutSuccess: "Signed out successfully",
    logoutConfirmTitle: "Confirm Sign Out",
    logoutConfirmDesc: "Your current session will be cleared. Continue?",
    logoutConfirm: "Sign Out",
    logoutCancel: "Cancel",
    roleLabel: "Role",
    pleaseEnterEmail: "Please enter your email",
    pleaseEnterPassword: "Please enter your password",
  },

  // ── Edit Layout Floating Toolbar ────────────────────────────────────────────
  editLayout: {
    done: "Done",
    cancel: "Cancel",
    reset: "Reset",
  },

  // ── Pet Chat ─────────────────────────────────────────────────────────────────
  pet: {
    inputPlaceholder: "Type a message...",
    voiceInput: "Hold to speak",
    voiceInputActive: "Release to send",
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
    noData: "No data",
    totalEnergyFooter: "24h cumulative usage",

    carbonFooter: "7-day comparison trend",

    intensityFooter: "Continuous decline trend ↓",

    costUnit: "CNY",
    costFooter: "Compared to yesterday baseline",

    renewableTarget: "Target: 90%",

    loadNormal: "● Normal",
  },

  // ── Widget Titles ───────────────────────────────────────────────────────────
  widgets: {
    "energy-total": "Today's Total Power",
    "energy-cost": "Today's Electricity Cost",
    "carbon-emission": "Today's Carbon Emission",
    "energy-intensity": "Energy Intensity",
    "load-status": "Load Status",
    "renewable-rate": "Renewable Energy Ratio",
    weather: "Weather",
    "energy-chart": "24h Energy Trend",
    "energy-breakdown": "Energy Breakdown",
    "alerts-list": "Real-time Alerts",
    "devices-status": "Device Status",
    "ai-suggestions": "AI Optimization",
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
    noData: "No data",
    trendTimeUnit: "h",
    hvac: "HVAC",
    lighting: "Lighting",
    equipment: "Equipment",
    other: "Other",
  },

  // ── Right Panel — Device Status ────────────────────────────────────────────
  devices: {
    airConditioning: "Air Conditioning",
    lighting: "Lighting System",
    elevators: "Elevators",
    servers: "Servers",
  },

  // ── Right Panel — Real-time Alerts ─────────────────────────────────────────
  alerts: {
    activeSuffix: "Active",
  },

  // ── Lighting Control Sheet ────────────────────────────────────────────────
  lighting: {
    title: "Area Lighting",
    selectRegion: "Select region",
    allOn: "All On",
    allOff: "All Off",
    empty: "No group data",
    error: "Operation failed",
  },

  // ── Label Info Panel ───────────────────────────────────────────────────────
  labelInfo: {
    office1: {
      title: "Office Area A",
      description:
        "The primary office zone on the west side of the building. Houses approximately 120 workstations with smart lighting and HVAC automation. Average daily energy consumption: 340 kWh.",
    },
    meeting: {
      title: "Meeting Area",
      description:
        "A centralized conference zone featuring 6 meeting rooms and 2 boardrooms. Equipped with intelligent occupancy sensors and automated blinds. Average daily energy consumption: 180 kWh.",
    },
    dataCenter: {
      title: "Data Center",
      description:
        "The building's IT infrastructure hub containing 8 server racks with redundant cooling. Temperature maintained at 22±1°C. Equipped with UPS backup and precision air conditioning. Average daily energy consumption: 520 kWh.",
    },
    exhibition: {
      title: "Exhibition Hall",
      description:
        "A spacious display area with dynamic lighting systems and digital signage. Used for product showcases and client presentations. Average daily energy consumption: 260 kWh.",
    },
    office2: {
      title: "Office Area B",
      description:
        "The east-wing office zone with 95 workstations. Features open-plan layout with zoned climate control and daylight harvesting systems. Average daily energy consumption: 290 kWh.",
    },
    lobby: {
      title: "Lobby",
      description:
        "The main entrance and reception area with high ceilings and natural lighting. Features smart glass facade and visitor flow monitoring. Average daily energy consumption: 110 kWh.",
    },
  },
};
