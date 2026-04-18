import { IconLayoutNavbar, IconLayoutNavbarCollapse } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useSettingsStore } from "~/store/settings";

export interface DashboardHeaderProps {
  className?: string;
  onLogoClick?: () => void;
  navVisible?: boolean;
}

export function DashboardHeader({ className, onLogoClick, navVisible }: DashboardHeaderProps) {
  const t = useLocale();
  const language = useSettingsStore((state) => state.language);
  const [now, setNow] = useState(() => new Date());

  function formatTime(d: Date) {
    return d.toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function formatDate(d: Date) {
    const dateStr = d
      .toLocaleDateString(language, { year: "numeric", month: "2-digit", day: "2-digit" })
      .replace(/\//g, ".");
    const weekStr = d.toLocaleDateString(language, { weekday: "long" });
    return `${dateStr} ${weekStr}`;
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={cn("relative z-20 h-14 overflow-hidden", className)}>
      {/* Background base */}
      <div className="absolute inset-0 bg-[rgba(2,10,22,0.82)]" />

      {/* Top glow edge */}
      <div className="via-cyber-cyan/30 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />

      {/* Center cyan badge — rounded capsule with border glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="relative flex h-8 items-center justify-center rounded-full px-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,210,230,0.18) 0%, rgba(0,160,190,0.06) 100%)",
            boxShadow:
              "0 0 0 1px rgba(0,220,255,0.55), 0 0 14px rgba(0,220,255,0.25) inset, 0 0 20px rgba(0,220,255,0.15)",
          }}
        >
          {/* Wing lines extending from badge */}
          <div
            className="absolute top-1/2 right-full h-px w-[28vw] max-w-[420px] -translate-y-1/2"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(0,220,255,0.35) 100%)",
            }}
          />
          <div
            className="absolute top-1/2 left-full h-px w-[28vw] max-w-[420px] -translate-y-1/2"
            style={{
              background: "linear-gradient(90deg, rgba(0,220,255,0.35) 0%, transparent 100%)",
            }}
          />

          {/* Content inside badge */}
          <div className="relative z-10 flex items-center gap-2.5">
            {/* Green pulse dot */}
            <span className="relative flex size-2">
              <span className="bg-cyber-green absolute inline-flex size-full animate-ping rounded-full opacity-70" />
              <span className="bg-cyber-green relative inline-flex size-2 rounded-full shadow-[0_0_8px_#22c55e]" />
            </span>

            <span className="font-heading text-foreground/95 text-[15px] font-semibold tracking-[0.15em]">
              {t.header.location}
            </span>

            <span className="text-muted-foreground/90 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wider">
              {t.header.monitoring}
            </span>
          </div>
        </div>
      </div>

      {/* Content layer */}
      <div className="relative flex h-full items-center justify-between px-6">
        {/* Left Logo + Brand */}
        <button
          type="button"
          onClick={onLogoClick}
          className="group focus-visible:ring-cyber-cyan/50 z-10 flex items-center gap-3 rounded-lg px-1 py-0.5 transition-colors hover:bg-white/5 focus-visible:ring-1 focus-visible:outline-none"
          title={navVisible ? t.header.toggleNavHide : t.header.toggleNavShow}
        >
          <div className="border-cyber-cyan/40 bg-cyber-cyan/10 group-hover:bg-cyber-cyan/15 relative flex size-9 items-center justify-center rounded-full border transition-colors">
            <img src="/favicon.ico" alt={t.common.logoAlt} className="size-4 object-contain" />
            <span className="border-cyber-cyan/40 bg-panel-dark text-cyber-cyan/70 absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full border">
              {navVisible ? <IconLayoutNavbar size={8} /> : <IconLayoutNavbarCollapse size={8} />}
            </span>
          </div>
          <div className="flex flex-col items-start gap-0">
            <span className="font-heading text-cyber-cyan text-sm font-bold tracking-[0.1em]">
              ECOCTRL {t.header.brandSub}
            </span>
            <span className="text-muted-foreground/80 text-[8px] tracking-[0.06em]">
              {t.header.tagline}
            </span>
          </div>
        </button>

        {/* Right time */}
        <div className="z-10 flex flex-col items-end gap-0 text-right">
          <span className="font-heading text-foreground/95 text-xl font-semibold tracking-wide tabular-nums">
            {formatTime(now)}
          </span>
          <span className="text-muted-foreground/70 text-[9px] tracking-wider">
            {formatDate(now)}
          </span>
        </div>
      </div>
    </header>
  );
}
