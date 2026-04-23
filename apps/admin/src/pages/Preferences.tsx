import { useEffect, useState } from "react";
import {
  Monitor,
  Moon,
  Palette,
  Sun,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Mail,
  Layout,
  PanelLeftClose,
  PanelLeftOpen,
  Breadcrumb,
  Save,
  RotateCcw,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Switch } from "@ecoctrl/ui";

import { preferencesApi } from "@/api/preferences";
import type { UserPreferences } from "@/types";

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
}

export default function Preferences({ userId }: PreferencesProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await preferencesApi.get(userId);
        setPrefs({ ...DEFAULT_PREFERENCES, ...data });
      } catch {
        // No server config yet, use defaults
        setPrefs(DEFAULT_PREFERENCES);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [userId]);

  const updateField = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    try {
      await preferencesApi.update(userId, prefs);
      setSuccess("设置已保存");
      // Apply theme immediately
      if (prefs.theme) {
        import("@/lib/darkMode").then((m) => m.applyDarkMode(prefs.theme!));
      }
    } catch (err) {
      console.error(err);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("确定要恢复默认设置吗？")) return;
    setResetting(true);
    try {
      await preferencesApi.delete(userId);
      setPrefs(DEFAULT_PREFERENCES);
      import("@/lib/darkMode").then((m) => m.applyDarkMode(DEFAULT_PREFERENCES.theme!));
      setSuccess("已恢复默认设置");
    } catch (err) {
      console.error(err);
      alert("恢复默认设置失败");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  const themeOptions: { value: UserPreferences["theme"]; label: string; icon: React.ReactNode }[] =
    [
      { value: "light", label: "浅色", icon: <Sun size={16} /> },
      { value: "dark", label: "深色", icon: <Moon size={16} /> },
      { value: "system", label: "跟随系统", icon: <Monitor size={16} /> },
    ];

  const densityOptions: { value: UserPreferences["density"]; label: string }[] = [
    { value: "compact", label: "紧凑" },
    { value: "comfortable", label: "舒适" },
    { value: "spacious", label: "宽松" },
  ];

  const fontSizeOptions: { value: UserPreferences["fontSize"]; label: string }[] = [
    { value: "small", label: "小" },
    { value: "medium", label: "中" },
    { value: "large", label: "大" },
  ];

  return (
    <div className="space-y-6">
      {/* UI Preferences */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">界面偏好</CardTitle>
          </div>
          <CardDescription className="text-xs">自定义界面主题、语言和显示效果。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              主题
            </Label>
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("theme", opt.value)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all ${
                    prefs.theme === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              语言
            </Label>
            <div className="relative max-w-xs">
              <Globe className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <select
                value={prefs.language}
                onChange={(e) =>
                  updateField("language", e.target.value as UserPreferences["language"])
                }
                className="bg-muted/30 border-border h-10 w-full rounded-md border pl-10 pr-3 text-sm"
              >
                <option value="zh-CN">中文（简体）</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>

          {/* Density */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              界面密度
            </Label>
            <div className="flex gap-2">
              {densityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("density", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm transition-all ${
                    prefs.density === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              字体大小
            </Label>
            <div className="flex gap-2">
              {fontSizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("fontSize", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm transition-all ${
                    prefs.fontSize === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">通知偏好</CardTitle>
          </div>
          <CardDescription className="text-xs">配置告警、声音和邮件通知方式。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
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
        </CardContent>
      </Card>

      {/* Layout Preferences */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <Layout size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">布局偏好</CardTitle>
          </div>
          <CardDescription className="text-xs">调整侧边栏、面包屑等布局元素。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
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
              <Breadcrumb size={18} />
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <AlertCircle size={16} />
            {success}
          </div>
        )}
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
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "保存中..." : "保存设置"}
          </Button>
        </div>
      </div>
    </div>
  );
}
