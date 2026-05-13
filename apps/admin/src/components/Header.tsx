import { Bell, Monitor, Moon, Search, Sun, ChevronDown, ChevronRight, Home } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@ecoctrl/ui";
import { Button } from "@ecoctrl/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { cn } from "@/lib/utils";

import { authApi } from "../api/auth";
import type { AuthUser } from "../api/auth";
import { useAvatar } from "@/hooks/useAvatar";
import { applyDarkMode } from "@/lib/darkMode";
import type { Theme } from "@/lib/darkMode";
import { useAppStore } from "@/store/appStore";
import { getBreadcrumbPath, getSiblings, findNode } from "./navConfig";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showBreadcrumb?: boolean;
  theme?: "light" | "dark" | "system";
}

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

export default function Header({
  activeTab,
  setActiveTab,
  showBreadcrumb,
  theme: themeProp,
}: HeaderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>(themeProp ?? "system");
  const avatarSrc = useAvatar(user?.id, user?.avatarUrl, avatarVersion);
  const setPreferenceOverride = useAppStore((state) => state.setPreferenceOverride);

  // Read each sub-tab state individually so selectors return stable primitives
  // and avoid triggering a zustand infinite-re-render loop.
  const modelsTab = useAppStore((s) => s.modelsTab);
  const energyTab = useAppStore((s) => s.energyTab);
  const faultsTab = useAppStore((s) => s.faultsTab);
  const dashboardModelTab = useAppStore((s) => s.dashboardModelTab);
  const workflowsTab = useAppStore((s) => s.workflowsTab);

  const currentNode = useMemo(() => findNode(activeTab), [activeTab]);
  const currentTabs = currentNode?.tabs;
  const tabStoreKey = currentNode?.tabStoreKey;
  const currentSubTab = useMemo(() => {
    if (!tabStoreKey) return undefined;
    switch (tabStoreKey) {
      case "modelsTab":
        return modelsTab;
      case "energyTab":
        return energyTab;
      case "faultsTab":
        return faultsTab;
      case "dashboardModelTab":
        return dashboardModelTab;
      case "workflowsTab":
        return workflowsTab;
    }
  }, [tabStoreKey, modelsTab, energyTab, faultsTab, dashboardModelTab, workflowsTab]);

  const breadcrumbPath = useMemo(
    () => getBreadcrumbPath(activeTab, currentSubTab),
    [activeTab, currentSubTab],
  );

  const handleTabChange = (tabId: string) => {
    if (!tabStoreKey) return;
    const state = useAppStore.getState();
    switch (tabStoreKey) {
      case "modelsTab":
        state.setModelsTab(tabId);
        break;
      case "energyTab":
        state.setEnergyTab(tabId);
        break;
      case "faultsTab":
        state.setFaultsTab(tabId);
        break;
      case "dashboardModelTab":
        state.setDashboardModelTab(tabId);
        break;
      case "workflowsTab":
        state.setWorkflowsTab(tabId);
        break;
    }
  };

  useEffect(() => {
    const effective = themeProp ?? "system";
    setTheme(effective);
    applyDarkMode(effective);
  }, [themeProp]);

  const toggleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
    applyDarkMode(next);
    setPreferenceOverride({ theme: next });
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

    const onAvatarUpdated = () => {
      setAvatarVersion((v) => v + 1);
      fetchUser();
    };
    window.addEventListener("avatar:updated", onAvatarUpdated);
    return () => window.removeEventListener("avatar:updated", onAvatarUpdated);
  }, []);

  const currentTitle = currentNode?.label ?? "管理总览";

  const breadcrumbVisible = showBreadcrumb !== false;

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <header className="border-border bg-card sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 lg:px-6">
      {/* Left: breadcrumb + tabs */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        {/* Breadcrumb — lg+ and when enabled */}
        {breadcrumbVisible && (
          <div className="hidden lg:flex items-center gap-0.5 text-sm">
            {/* Home — plain text, no dropdown */}
            <span className="text-muted-foreground flex items-center gap-1 px-1.5 py-0.5">
              <Home size={14} />
              <span>首页</span>
            </span>

            {breadcrumbPath.map((segment) => {
              const siblings = getSiblings(segment.id);
              const hasDropdown = siblings.length > 1;
              const node = findNode(segment.id);
              const Icon = node?.icon;

              return (
                <React.Fragment key={segment.id}>
                  <span className="text-muted-foreground mx-0.5">/</span>
                  {!hasDropdown ? (
                    <span
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5",
                        segment.id === activeTab
                          ? "text-foreground font-medium"
                          : "text-muted-foreground",
                      )}
                    >
                      {Icon && <Icon size={14} />}
                      <span>{segment.label}</span>
                    </span>
                  ) : (
                    <DropdownMenu
                      onOpenChange={(open) => setOpenDropdownId(open ? segment.id : null)}
                    >
                      <DropdownMenuTrigger
                        className={cn(
                          "flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors cursor-pointer",
                          segment.id === activeTab
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {Icon && <Icon size={14} />}
                        <span>{segment.label}</span>
                        {openDropdownId === segment.id ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {siblings.map((sibling) => (
                          <DropdownMenuItem
                            key={sibling.id}
                            onClick={() => setActiveTab(sibling.id)}
                            className={cn(activeTab === sibling.id && "bg-accent")}
                          >
                            <sibling.icon size={14} className="mr-2" />
                            {sibling.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Medium/small screens: just current title */}
        <div className="lg:hidden text-sm font-semibold truncate">{currentTitle}</div>

        {/* When breadcrumb is disabled on large screens, show title instead */}
        {!breadcrumbVisible && (
          <div className="hidden lg:block text-sm font-semibold">{currentTitle}</div>
        )}

        {/* Tabs — md+ */}
        {currentTabs && (
          <div className="hidden md:flex ml-3 border-l border-border pl-3">
            <div className="bg-muted/50 inline-flex h-7 items-center rounded-md p-0.5">
              {currentTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-sm px-2.5 py-0.5 text-xs font-medium transition-all whitespace-nowrap",
                    currentSubTab === tab.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: tools */}
      <div className="flex items-center gap-0.5">
        {/* Search — expanded by default, collapses to icon on small screens */}
        <div className="relative hidden md:flex items-center">
          <Search className="text-muted-foreground absolute left-2.5 h-4 w-4 pointer-events-none" />
          <Input
            type="search"
            placeholder="搜索设备..."
            className="bg-muted/50 focus-visible:ring-primary/20 h-8 w-48 lg:w-60 border-none pl-9 shadow-none focus-visible:ring-1 text-sm"
          />
        </div>

        {/* Search icon-only on small screens */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground md:hidden h-8 w-8"
        >
          <Search size={18} />
        </Button>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative h-8 w-8"
          title={ThemeLabel[theme]}
          onClick={toggleTheme}
        >
          {ThemeIcon[theme]}
        </Button>

        {/* Notification */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative h-8 w-8"
        >
          <Bell size={18} />
          <span className="bg-destructive border-card absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full border-2" />
        </Button>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="hover:bg-muted flex items-center gap-2 rounded-md p-1 pl-2 transition-all h-8"
              >
                <span className="text-foreground hidden sm:inline text-sm font-medium">
                  {user?.username ?? "Admin"}
                </span>
                <Avatar className="ring-muted h-7 w-7 ring-2 ring-offset-2">
                  <AvatarImage
                    key={avatarVersion}
                    src={
                      avatarSrc ?? `https://avatar.vercel.sh/${user?.username ?? "admin"}?size=32`
                    }
                  />
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
              <DropdownMenuItem onClick={() => setActiveTab("profile")}>个人信息</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("preferences")}>
                偏好设置
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500"
                onClick={async () => {
                  try {
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (refreshToken) {
                      await authApi.logout(refreshToken);
                    }
                  } catch {
                    // ignore
                  }
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  window.location.reload();
                }}
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
