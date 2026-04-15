import { IconLayoutNavbar, IconLayoutNavbarCollapse } from "@tabler/icons-react"

import { locale as t } from "~/locales"
import { cn } from "~/lib/utils"

// ─── Header ────────────────────────────────────────────────────────────────────

interface DashboardHeaderProps {
  className?: string
  onLogoClick?: () => void
  navVisible?: boolean
}

export function DashboardHeader({ className, onLogoClick, navVisible }: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col border-b border-white/12",
        className,
      )}
      style={{ background: "rgba(4,14,30,0.42)", backdropFilter: "blur(20px) saturate(160%)" }}
    >
      {/* ── Main title bar ── */}
      <div className="flex h-14 items-center px-4">
        {/* Brand — clickable to toggle nav */}
        <button
          type="button"
          onClick={onLogoClick}
          className="group flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan/50"
          title={navVisible ? t.header.toggleNavHide : t.header.toggleNavShow}
        >
          <div className="relative flex size-8 items-center justify-center rounded-full border border-cyber-cyan/50 bg-cyber-cyan/10 transition-colors group-hover:bg-cyber-cyan/20">
            <img
              src="/favicon.ico"
              alt={t.common.logoAlt}
              className="size-4 object-contain"
            />
            {/* Nav toggle indicator */}
            <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full border border-cyber-cyan/40 bg-panel-dark text-cyber-cyan/70">
              {navVisible
                ? <IconLayoutNavbar size={8} />
                : <IconLayoutNavbarCollapse size={8} />
              }
            </span>
          </div>
          <div className="flex flex-col gap-0">
            <span className="font-heading text-[13px] font-bold tracking-[0.12em] text-cyber-cyan">
              ECOCTRL
            </span>
            <span className="text-[8px] tracking-[0.08em] text-muted-foreground/70">
              {t.header.brandSub}
            </span>
          </div>
        </button>

        {/* Center title */}
        <div className="flex flex-1 flex-col items-center gap-0.5">
          <h1 className="font-heading text-[18px] font-bold tracking-[0.06em] text-foreground">
            {t.header.pageTitle}
          </h1>
          <p className="text-[9px] tracking-[0.15em] text-muted-foreground/70 uppercase">
            {t.header.tagline}
          </p>
        </div>

        {/* Time / date */}
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="font-heading text-sm tabular-nums text-foreground/80">
            18:07
          </span>
          <span className="text-[9px] tracking-wider text-muted-foreground/60">
            {t.header.date}
          </span>
        </div>
      </div>
    </header>
  )
}
