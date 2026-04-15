import {
  IconBuildingSkyscraper,
  IconChartBar,
  IconLayoutDashboard,
  IconSettings,
  IconTopologyFull,
} from "@tabler/icons-react"
import { useState } from "react"

import { locale as t } from "~/locales"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { cn } from "~/lib/utils"

const navItems = [
  { id: "overview", label: t.nav.overview, icon: <IconLayoutDashboard size={14} /> },
  { id: "floors",   label: t.nav.floors,   icon: <IconBuildingSkyscraper size={14} /> },
  { id: "systems",  label: t.nav.systems,  icon: <IconTopologyFull size={14} /> },
  { id: "analysis", label: t.nav.analysis, icon: <IconChartBar size={14} /> },
  { id: "settings", label: t.nav.settings, icon: <IconSettings size={14} /> },
]

export function DashboardNav({ className }: { className?: string }) {
  const [active, setActive] = useState("overview")

  return (
    <nav
      className={cn(
        "flex h-13 items-center justify-center border-t border-white/12 px-4",
        className,
      )}
      style={{ background: "rgba(4,14,30,0.42)", backdropFilter: "blur(20px) saturate(160%)" }}
    >
      <Tabs value={active} onValueChange={setActive} className="w-full">
        <TabsList
          variant="line"
          className="h-10 w-full bg-transparent gap-0"
        >
          {navItems.map((item) => (
            <TabsTrigger
              key={item.id}
              value={item.id}
              className={cn(
                "flex-1 gap-1.5 text-[11px] tracking-wide rounded-none",
                "border-b-2 border-transparent transition-colors",
                "data-active:border-cyber-cyan data-active:text-cyber-cyan",
                "hover:text-foreground/80",
              )}
            >
              {item.icon}
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  )
}
