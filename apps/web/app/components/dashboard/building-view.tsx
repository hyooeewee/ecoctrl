import { locale as t } from "~/locales"
import { cn } from "~/lib/utils"

// ─── Area label floating pill ──────────────────────────────────────────────────

interface AreaLabelProps {
  label: string
  x: string
  y: string
}

function AreaLabel({ label, x, y }: AreaLabelProps) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5 rounded border border-cyber-cyan/40 bg-panel-dark/90",
        "px-2 py-1 text-[11px] font-medium tracking-wide text-cyan-200/90 backdrop-blur-sm",
      )}
      style={{ left: x, top: y }}
    >
      <span className="size-1.5 rounded-full bg-cyber-cyan/70" />
      {label}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuildingView({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#060d18]",
        className,
      )}
    >
      {/* ── SVG isometric building ── */}
      <svg
        viewBox="0 0 1300 680"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label={t.building.ariaLabel}
      >
        <defs>
          {/* Deep navy background gradient */}
          <radialGradient id="bgGrad" cx="50%" cy="55%" r="75%">
            <stop offset="0%"   stopColor="#102a50" />
            <stop offset="45%"  stopColor="#091e3a" />
            <stop offset="100%" stopColor="#040f22" />
          </radialGradient>

          {/* Grid pattern */}
          <pattern id="grid" width="65" height="65" patternUnits="userSpaceOnUse">
            <path
              d="M 65 0 L 0 0 0 65"
              fill="none"
              stroke="#00F5FF"
              strokeWidth="1"
              strokeOpacity="0.45"
            />
          </pattern>

          {/* Diagonal grid overlay */}
          <pattern id="diag" width="80" height="80" patternUnits="userSpaceOnUse">
            <line x1="-80" y1="80" x2="80" y2="-80"
              stroke="#00F5FF" strokeWidth="0.6" strokeOpacity="0.2" />
            <line x1="0" y1="80" x2="160" y2="-80"
              stroke="#00F5FF" strokeWidth="0.6" strokeOpacity="0.2" />
          </pattern>

          {/* Glow filter for hot zones */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Cyan glow for labels */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Building top face gradient */}
          <linearGradient id="topFaceGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#0e2035" />
            <stop offset="100%" stopColor="#081520" />
          </linearGradient>

          {/* Scan line overlay */}
          <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00F5FF" stopOpacity="0.06" />
            <stop offset="50%"  stopColor="#00F5FF" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#00F5FF" stopOpacity="0.06" />
          </linearGradient>

          {/* Edge ambient glow gradients */}
          <linearGradient id="leftGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0060cc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0060cc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rightGlow" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%"   stopColor="#0060cc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0060cc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="topGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0048aa" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0048aa" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Deep navy background */}
        <rect width="1300" height="680" fill="url(#bgGrad)" />

        {/* Background grid */}
        <rect width="1300" height="680" fill="url(#grid)" />
        <rect width="1300" height="680" fill="url(#diag)" />

        {/* Edge ambient glows (visible through transparent panels) */}
        <rect width="320" height="680" fill="url(#leftGlow)" />
        <rect x="980" width="320" height="680" fill="url(#rightGlow)" />
        <rect width="1300" height="200" fill="url(#topGlow)" />

        {/* Strong radial atmosphere glow at center */}
        <ellipse cx="650" cy="340" rx="560" ry="320"
          fill="#00F5FF" fillOpacity="0.07" />
        <ellipse cx="650" cy="340" rx="300" ry="160"
          fill="#0070ff" fillOpacity="0.10" />

        {/* ── Building: Top face (isometric rhombus) ── */}
        <polygon
          points="330,260 650,90 970,260 650,430"
          fill="url(#topFaceGrad)"
          stroke="#00F5FF"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Internal room divisions on top face */}
        <line x1="650" y1="90" x2="650" y2="430"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.2" />
        <line x1="330" y1="260" x2="650" y2="175"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.15" />
        <line x1="970" y1="260" x2="650" y2="175"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.15" />

        {/* Data Center zone highlight */}
        <polygon
          points="490,175 650,90 650,260 490,345"
          fill="#0080FF"
          fillOpacity="0.08"
          stroke="#00F5FF"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />

        {/* Server room indicator */}
        <polygon
          points="650,175 810,90 810,175 650,260"
          fill="#0040CC"
          fillOpacity="0.06"
          stroke="#00F5FF"
          strokeWidth="0.6"
          strokeOpacity="0.2"
        />

        {/* ── Building: Left wall face ── */}
        <polygon
          points="330,260 330,490 650,660 650,430"
          fill="#060d18"
          stroke="#00F5FF"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
        <line x1="330" y1="340" x2="580" y2="545"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.12" />
        <line x1="330" y1="410" x2="540" y2="594"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.12" />
        <line x1="440" y1="260" x2="440" y2="576"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.1" />
        <line x1="540" y1="260" x2="540" y2="630"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.1" />

        {/* ── Building: Right wall face ── */}
        <polygon
          points="970,260 970,490 650,660 650,430"
          fill="#07111f"
          stroke="#00F5FF"
          strokeWidth="1"
          strokeOpacity="0.2"
        />
        <line x1="970" y1="340" x2="720" y2="545"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.1" />
        <line x1="970" y1="410" x2="760" y2="594"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.1" />
        <line x1="860" y1="260" x2="860" y2="576"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.08" />
        <line x1="760" y1="260" x2="760" y2="630"
          stroke="#00F5FF" strokeWidth="0.5" strokeOpacity="0.08" />

        {/* ── Hot spots: Red energy zones ── */}
        <ellipse
          cx="490" cy="230" rx="60" ry="30"
          fill="#EF4444"
          fillOpacity="0.45"
          filter="url(#glow)"
        />
        <ellipse
          cx="490" cy="230" rx="28" ry="14"
          fill="#EF4444"
          fillOpacity="0.8"
        />
        <ellipse
          cx="730" cy="175" rx="40" ry="20"
          fill="#F97316"
          fillOpacity="0.4"
          filter="url(#glow)"
        />
        <ellipse
          cx="730" cy="175" rx="18" ry="9"
          fill="#F97316"
          fillOpacity="0.7"
        />

        {/* ── Connector lines from labels to building ── */}
        <line x1="135" y1="116" x2="380" y2="220"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="4 3" />
        <line x1="510" y1="76" x2="580" y2="130"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="4 3" />
        <line x1="490" y1="290" x2="490" y2="230"
          stroke="#EF4444" strokeWidth="0.8" strokeOpacity="0.5"
          strokeDasharray="3 2" />
        <line x1="880" y1="164" x2="840" y2="200"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="4 3" />
        <line x1="1090" y1="118" x2="930" y2="220"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="4 3" />
        <line x1="1090" y1="348" x2="900" y2="360"
          stroke="#00F5FF" strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="4 3" />

        {/* ── Scan line overlay ── */}
        <rect width="1300" height="680" fill="url(#scanGrad)" />

        {/* Corner frame accents */}
        <path d="M 0 0 L 30 0 L 30 3 L 3 3 L 3 30 L 0 30 Z"
          fill="#00F5FF" fillOpacity="0.5" />
        <path d="M 1300 0 L 1270 0 L 1270 3 L 1297 3 L 1297 30 L 1300 30 Z"
          fill="#00F5FF" fillOpacity="0.5" />
        <path d="M 0 680 L 30 680 L 30 677 L 3 677 L 3 650 L 0 650 Z"
          fill="#00F5FF" fillOpacity="0.5" />
        <path d="M 1300 680 L 1270 680 L 1270 677 L 1297 677 L 1297 650 L 1300 650 Z"
          fill="#00F5FF" fillOpacity="0.5" />
      </svg>

      {/* ── Floating area labels (positioned absolutely over SVG) ── */}
      <AreaLabel label={t.building.officeArea}     x="4%"  y="11%" />
      <AreaLabel label={t.building.meetingArea}    x="36%" y="7%"  />
      <AreaLabel label={t.building.dataCenter}     x="33%" y="38%" />
      <AreaLabel label={t.building.exhibitionHall} x="62%" y="20%" />
      <AreaLabel label={t.building.officeArea}     x="79%" y="11%" />
      <AreaLabel label={t.building.lobby}          x="79%" y="45%" />
    </div>
  )
}
