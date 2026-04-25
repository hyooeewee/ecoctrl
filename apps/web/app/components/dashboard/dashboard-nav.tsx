import { Building2, BarChart3, LayoutDashboard, Settings, Network } from "lucide-react";
import { NavLink, useLocation } from "react-router";

import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

export function DashboardNav({ className }: { className?: string }) {
  const t = useLocale();
  const location = useLocation();

  const navItems = [
    {
      id: "overview",
      to: "/",
      label: t.nav.overview,
      Icon: LayoutDashboard,
    },
    {
      id: "floors",
      to: "/floors",
      label: t.nav.floors,
      Icon: Building2,
    },
    {
      id: "systems",
      to: "/systems",
      label: t.nav.systems,
      Icon: Network,
    },
    {
      id: "analysis",
      to: "/analysis",
      label: t.nav.analysis,
      Icon: BarChart3,
    },
    {
      id: "settings",
      to: "/settings",
      label: t.nav.settings,
      Icon: Settings,
    },
  ];

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => {
      if (item.to === "/") return location.pathname === "/";
      return location.pathname.startsWith(item.to);
    }),
  );

  const pillPaddingX = 6;
  const itemWidth = 88;
  const indicatorLeft = pillPaddingX + activeIndex * itemWidth;
  const indicatorWidth = itemWidth;

  return (
    <nav className={cn("flex h-[60px] items-center justify-center px-4", className)}>
      <div className="relative">
        {/* ambient glow beneath the pill */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-full opacity-60 blur-[8px]"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 100%, rgba(34,211,238,0.35), transparent 70%)",
          }}
        />

        {/* main pill shell */}
        <div className="relative flex h-12 items-center overflow-hidden rounded-full border border-white/[0.12] bg-[rgba(4,14,30,0.88)] px-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          {/* sliding liquid indicator */}
          <div
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full bg-gradient-to-b from-cyan-400/22 to-cyan-400/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(34,211,238,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: indicatorWidth,
              left: indicatorLeft,
            }}
          />

          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === "/"}
                className="group relative z-10 flex h-full w-22 items-center justify-center gap-1.5 outline-none"
              >
                <item.Icon
                  size={isActive ? 16 : 15}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={cn(
                    "transition-all duration-300 ease-out",
                    isActive
                      ? "text-cyber-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.85)]"
                      : "text-muted-foreground/60 group-hover:text-cyber-cyan/80",
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-wide transition-colors duration-300",
                    isActive
                      ? "text-cyber-cyan"
                      : "text-muted-foreground/50 group-hover:text-foreground/80",
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
