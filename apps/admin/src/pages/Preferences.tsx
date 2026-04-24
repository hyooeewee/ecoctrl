/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import {
  Monitor,
  Palette,
  Type,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Mail,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
  List,
  RotateCcw,
  Globe,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { Button } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Switch } from "@ecoctrl/ui";

import { preferencesApi } from "@/api/preferences";
import SettingsPage from "@/components/SettingsPage";
import type { UserPreferences } from "@ecoctrl/shared";

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "zh-CN",
  density: "comfortable",
  fontSize: "medium",
  desktopNotification: true,
  alertSound: true,
  emailNotification: false,
  sidebarCollapsed: false,
  showBreadcrumb: true,
};

interface PreferencesProps {
  userId: string;
  initialPrefs?: UserPreferences;
  onSaved?: (prefs: UserPreferences) => void;
}

export default function Preferences({ userId, initialPrefs, onSaved }: PreferencesProps) {
  const [prefs, setPrefs] = useState<UserPreferences>({ ...DEFAULT_PREFERENCES, ...initialPrefs });
  const [loading, setLoading] = useState(!initialPrefs);
  const [resetting, setResetting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialPrefs) {
      setPrefs({ ...DEFAULT_PREFERENCES, ...initialPrefs });
      setLoading(false);
      return;
    }
    const fetchPrefs = async () => {
      try {
        const data = await preferencesApi.get(userId);
        setPrefs({ ...DEFAULT_PREFERENCES, ...data });
        onSaved?.({ ...DEFAULT_PREFERENCES, ...data });
      } catch {
        setPrefs(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [userId, initialPrefs]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const doSave = async (nextPrefs: UserPreferences) => {
    setSaveStatus("saving");
    try {
      await preferencesApi.update(userId, nextPrefs);
      setSaveStatus("saved");
      onSaved?.(nextPrefs);
      if (nextPrefs.theme) {
        import("@/lib/darkMode").then((m) => m.applyDarkMode(nextPrefs.theme!));
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const updateField = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const next = { ...prefs, [key]: value } as UserPreferences;
    setPrefs(next);
    setSaveStatus("idle");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(next), 500);
  };

  const handleReset = async () => {
    if (!confirm("确定要恢复默认设置吗？")) return;
    setResetting(true);
    try {
      await preferencesApi.delete(userId);
      setPrefs(DEFAULT_PREFERENCES);
      onSaved?.(DEFAULT_PREFERENCES);
      import("@/lib/darkMode").then((m) => m.applyDarkMode(DEFAULT_PREFERENCES.theme!));
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      console.error(err);
      alert("恢复默认设置失败");
    } finally {
      setResetting(false);
    }
  };

  const statusEl =
    saveStatus === "saving" ? (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        保存中...
      </div>
    ) : saveStatus === "saved" ? (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <CheckCircle2 size={14} />
        已自动保存
      </div>
    ) : saveStatus === "error" ? (
      <div className="flex items-center gap-1.5 text-xs text-red-500">
        <XCircle size={14} />
        保存失败
      </div>
    ) : null;

  const sections = [
    {
      id: "appearance",
      label: "外观",
      icon: Palette,
      description: "自定义界面主题、语言和显示效果。",
      content: (
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Monitor size={18} />
              <div>
                <Label className="text-sm font-semibold">主题</Label>
                <p className="text-muted-foreground text-xs">选择浅色、深色或跟随系统。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={prefs.theme}
                onChange={(e) => updateField("theme", e.target.value as UserPreferences["theme"])}
                className="bg-muted/30 border-border h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="system">跟随系统</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Globe size={18} />
              <div>
                <Label className="text-sm font-semibold">语言</Label>
                <p className="text-muted-foreground text-xs">选择界面显示语言。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={prefs.language}
                onChange={(e) =>
                  updateField("language", e.target.value as UserPreferences["language"])
                }
                className="bg-muted/30 border-border h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="zh-CN">中文（简体）</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Layout size={18} />
              <div>
                <Label className="text-sm font-semibold">界面密度</Label>
                <p className="text-muted-foreground text-xs">控制元素间距和紧凑程度。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={prefs.density}
                onChange={(e) =>
                  updateField("density", e.target.value as UserPreferences["density"])
                }
                className="bg-muted/30 border-border h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="compact">紧凑</option>
                <option value="comfortable">舒适</option>
                <option value="spacious">宽松</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Type size={18} />
              <div>
                <Label className="text-sm font-semibold">字体大小</Label>
                <p className="text-muted-foreground text-xs">调整全局字体缩放比例。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <select
                value={prefs.fontSize}
                onChange={(e) =>
                  updateField("fontSize", e.target.value as UserPreferences["fontSize"])
                }
                className="bg-muted/30 border-border h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "notification",
      label: "通知",
      icon: Bell,
      description: "配置告警、声音和邮件通知方式。",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.desktopNotification ? <Bell size={18} /> : <BellOff size={18} />}
              <div>
                <Label className="text-sm font-semibold">启用桌面通知</Label>
                <p className="text-muted-foreground text-xs">在浏览器中弹出系统级通知。</p>
              </div>
            </div>
            <Switch
              checked={prefs.desktopNotification}
              onCheckedChange={(v) => updateField("desktopNotification", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.alertSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <div>
                <Label className="text-sm font-semibold">告警提示音</Label>
                <p className="text-muted-foreground text-xs">新告警到达时播放提示音。</p>
              </div>
            </div>
            <Switch
              checked={prefs.alertSound}
              onCheckedChange={(v) => updateField("alertSound", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail size={18} />
              <div>
                <Label className="text-sm font-semibold">邮件通知</Label>
                <p className="text-muted-foreground text-xs">通过 SMTP 发送告警和报表邮件。</p>
              </div>
            </div>
            <Switch
              checked={prefs.emailNotification}
              onCheckedChange={(v) => updateField("emailNotification", v)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "layout",
      label: "布局",
      icon: Layout,
      description: "调整侧边栏、面包屑等布局元素。",
      content: (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {prefs.sidebarCollapsed ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              <div>
                <Label className="text-sm font-semibold">默认折叠侧边栏</Label>
                <p className="text-muted-foreground text-xs">登录后侧边栏默认收起。</p>
              </div>
            </div>
            <Switch
              checked={prefs.sidebarCollapsed}
              onCheckedChange={(v) => updateField("sidebarCollapsed", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <List size={18} />
              <div>
                <Label className="text-sm font-semibold">面包屑导航</Label>
                <p className="text-muted-foreground text-xs">在页面顶部显示导航路径。</p>
              </div>
            </div>
            <Switch
              checked={prefs.showBreadcrumb}
              onCheckedChange={(v) => updateField("showBreadcrumb", v)}
            />
          </div>
        </div>
      ),
    },
  ];

  const actions = (
    <div className="flex items-center justify-between">
      {statusEl}
      <div className="ml-auto flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={resetting}
          className="gap-2"
        >
          {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
          {resetting ? "恢复中..." : "恢复默认"}
        </Button>
      </div>
    </div>
  );

  return <SettingsPage sections={sections} loading={loading} actions={actions} />;
}
