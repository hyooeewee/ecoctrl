import { Bell, Monitor, Moon, Search, Sun } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import type { User } from "@ecoctrl/shared";
import { authApi } from "../api/auth";
import { applyDarkMode, getStoredTheme } from "@/lib/darkMode";
import type { Theme } from "@/lib/darkMode";

interface HeaderProps {
  activeTab: string;
}

const tabTitleMap: Record<string, string> = {
  dashboard: "管理总览",
  config: "系统配置",
  accounts: "账户控制",
  models: "模型与对象",
  settingsGroup: "3D 模型设置",
  monitoring: "流程图实时监控",
  reports: "报表管理",
  maintenance: "维保管理",
  faults: "故障管理",
  energy: "能耗管理",
};

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

const ThemeIcon: Record<Theme, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  system: <Monitor size={18} />,
};

const ThemeLabel: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export default function Header({ activeTab }: HeaderProps) {
  const currentTitle = tabTitleMap[activeTab] || "管理总览";
  const [user, setUser] = useState<Pick<User, "username" | "avatarUrl"> | null>(null);
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = getStoredTheme() ?? "system";
    setTheme(stored);
    applyDarkMode(stored);
  }, []);

  const toggleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
    applyDarkMode(next);
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authApi.me();
        setUser(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  return (
    <header className="border-border bg-card sticky top-0 z-30 flex h-16 items-center justify-between border-b px-8">
      <div className="text-muted-foreground flex flex-1 items-center gap-4 text-sm">
        <span>首页 /</span>
        <span className="text-foreground font-semibold">{currentTitle}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative hidden w-64 md:block">
          <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
          <Input
            type="search"
            placeholder="搜索设备..."
            className="bg-muted/50 focus-visible:ring-primary/20 h-9 border-none pl-10 shadow-none focus-visible:ring-1"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
          title={ThemeLabel[theme]}
          onClick={toggleTheme}
        >
          {ThemeIcon[theme]}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <Bell size={20} />
          <span className="bg-destructive border-card absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full border-2"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="hover:bg-muted flex items-center gap-3 rounded-md p-1 pl-3 transition-all"
              >
                <span className="text-foreground text-sm font-medium">
                  {user?.username ?? "Admin"}
                </span>
                <Avatar className="ring-muted h-8 w-8 ring-2 ring-offset-2">
                  <AvatarImage src={user?.avatarUrl ?? `https://avatar.vercel.sh/admin?size=32`} />
                  <AvatarFallback>
                    {(user?.username ?? "Admin").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="mt-2 w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>个人信息</DropdownMenuItem>
              <DropdownMenuItem>偏好设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500">退出登录</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
