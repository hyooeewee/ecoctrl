import React from 'react';
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
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: '管理总览', icon: LayoutDashboard },
  { id: 'config', label: '系统配置', icon: Settings },
  { id: 'accounts', label: '账户控制', icon: Users },
  { id: 'models', label: '模型与对象', icon: Box },
  { id: 'settingsGroup', label: '3D 模型设置', icon: BoxSelect },
  { id: 'monitoring', label: '流程图实时监控', icon: Monitor },
  { id: 'reports', label: '报表管理', icon: FileBox },
  { id: 'maintenance', label: '维保管理', icon: Wrench },
  { id: 'faults', label: '故障管理', icon: AlertTriangle },
  { id: 'energy', label: '能耗管理', icon: Zap },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.32, 0.72, 0, 1] 
      }}
      className="h-screen bg-card text-foreground flex flex-col border-r border-border sticky top-0 z-50 overflow-hidden"
    >
      {/* Brand */}
      <div 
        className={cn(
          "h-16 flex items-center px-[18px] justify-between border-b border-border group relative transition-colors duration-200",
          collapsed && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => collapsed && setCollapsed(false)}
      >
        <div className={cn(
          "flex items-center gap-2.5 overflow-hidden transition-all duration-300",
          collapsed && "group-hover:opacity-0 group-hover:scale-90"
        )}>
          <BrandLogo size={24} className="shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-primary font-bold text-lg tracking-tight whitespace-nowrap overflow-hidden"
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
            className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8"
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
            className="text-primary shrink-0 h-8 w-8 absolute left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 bg-background/80 backdrop-blur-sm border border-primary/20 shadow-sm"
          >
            <ChevronRight size={18} strokeWidth={3} />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide overflow-x-hidden">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="relative">
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center h-10 px-2.5 rounded-md transition-all text-sm group relative overflow-hidden",
                    isActive 
                      ? "bg-primary/5 text-primary font-bold shadow-xs active-nav-glow" 
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <div className="w-5 flex items-center justify-center shrink-0">
                    <Icon 
                      size={18} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={cn("transition-transform duration-200", isActive && "scale-110")} 
                    />
                  </div>
                  
                  <div className="flex-1 text-left overflow-hidden">
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="whitespace-nowrap ml-3"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" 
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>


    </motion.aside>
  );
}
