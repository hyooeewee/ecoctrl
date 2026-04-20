import {
  LayoutDashboard,
  Settings,
  Users,
  Box,
  BoxSelect,
  Monitor,
  FileBox,
  Wrench,
  AlertTriangle,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React from "react";

import { Button } from "@ecoctrl/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ecoctrl/ui";
import { cn } from "@/lib/utils";

import { BrandLogo } from "./BrandLogo";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: "overview", label: "管理总览", icon: LayoutDashboard },
  { id: "accounts", label: "账户控制", icon: Users },
  { id: "models", label: "模型与对象", icon: Box },
  { id: "settingsGroup", label: "3D 模型设置", icon: BoxSelect },
  { id: "monitoring", label: "流程图实时监控", icon: Monitor },
  { id: "reports", label: "报表管理", icon: FileBox },
  { id: "maintenance", label: "维保管理", icon: Wrench },
  { id: "faults", label: "故障管理", icon: AlertTriangle },
  { id: "energy", label: "能耗管理", icon: Zap },
  { id: "config", label: "系统配置", icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1],
      }}
      className="bg-card text-foreground border-border sticky top-0 z-10 flex h-screen flex-col overflow-hidden border-r"
    >
      {/* Brand */}
      <div
        className={cn(
          "border-border group relative flex h-16 items-center justify-between border-b px-[18px] transition-colors duration-200",
          collapsed && "hover:bg-muted/50 cursor-pointer",
        )}
        onClick={() => collapsed && setCollapsed(false)}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-all duration-300",
            collapsed && "group-hover:scale-90 group-hover:opacity-0",
          )}
        >
          <BrandLogo size={24} className="shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-primary overflow-hidden text-lg font-bold tracking-tight whitespace-nowrap"
              >
                EcoCtrl 能管平台
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
          >
            <ChevronLeft size={18} />
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            className="text-primary bg-background/80 border-primary/20 absolute left-1/2 h-8 w-8 shrink-0 -translate-x-1/2 scale-75 border opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
          >
            <ChevronRight size={18} strokeWidth={3} />
          </Button>
        )}
      </div>

      {/* Nav */}
      <TooltipProvider>
        <nav className="scrollbar-hide flex-1 overflow-x-hidden overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id} className="relative">
                  <Tooltip>
                    <TooltipTrigger
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "group relative flex h-10 w-full items-center overflow-hidden rounded-md px-2.5 text-sm transition-all",
                        isActive
                          ? "bg-primary/5 text-primary active-nav-glow font-bold shadow-xs"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <div className="flex w-5 shrink-0 items-center justify-center">
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={cn(
                            "transition-transform duration-200",
                            isActive && "scale-110",
                          )}
                        />
                      </div>

                      <div className="flex-1 overflow-hidden text-left">
                        <AnimatePresence mode="wait">
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                              className="ml-3 whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full"
                        />
                      )}
                    </TooltipTrigger>
                    {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>
    </motion.aside>
  );
}
