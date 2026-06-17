// ========================================
// Model Editor Top Bar
// ========================================

import React, { useEffect, useState } from "react";
import { ArrowLeft, Monitor, Moon, Save, Sun } from "lucide-react";
import { Button } from "@ecoctrl/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@ecoctrl/ui";
import AsyncActionButton from "@/components/AsyncActionButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecoctrl/ui";

import { auth } from "@/lib/auth";
import { authApi } from "@/api/auth";
import type { AuthUser } from "@/api/auth";
import { useAvatar } from "@/hooks/useAvatar";
import { applyDarkMode } from "@/lib/darkMode";
import type { Theme } from "@/lib/darkMode";
import { useAppStore } from "@/store/appStore";

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];

const ThemeIcon: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

interface ModelEditorTopBarProps {
  onBack: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  isDirty: boolean;
}

export default function ModelEditorTopBar({
  onBack,
  onSave,
  saving,
  isDirty,
}: ModelEditorTopBarProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>("system");
  const avatarSrc = useAvatar(user?.id, user?.avatarUrl, avatarVersion);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setPreferenceOverride = useAppStore((state) => state.setPreferenceOverride);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authApi.me();
        setUser(data);
      } catch {
        // ignore
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

  const toggleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
    applyDarkMode(next);
    setPreferenceOverride({ theme: next });
  };

  return (
    <header className="bg-card border-border z-20 flex h-12 shrink-0 items-center justify-between border-b px-4">
      {/* Left: back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} title="返回">
          <ArrowLeft size={18} />
        </Button>
        <div className="bg-border h-4 w-px" />
        <h1 className="text-sm font-semibold">大屏模型编辑器</h1>
      </div>

      {/* Right: save + theme + user */}
      <div className="flex items-center gap-2">
        <AsyncActionButton
          size="sm"
          action={onSave}
          disabled={saving}
          idle={
            <>
              <Save size={14} className="mr-1.5" />
              保存
            </>
          }
          loading="保存中..."
          success="已保存"
          error="保存失败"
        />
        <span className="text-xs text-muted-foreground">
          {saving ? "保存中..." : isDirty ? "未保存" : "已保存"}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="切换主题"
          onClick={toggleTheme}
        >
          {ThemeIcon[theme]}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="flex items-center gap-2 rounded-md p-1 pl-2 h-8">
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.username ?? "Admin"}
                </span>
                <Avatar className="h-7 w-7 ring-2 ring-muted ring-offset-2">
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
                    const refreshToken = auth.getRefreshToken();
                    if (refreshToken) {
                      await authApi.logout(refreshToken);
                    }
                  } catch {
                    // ignore
                  }
                  auth.clear();
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
