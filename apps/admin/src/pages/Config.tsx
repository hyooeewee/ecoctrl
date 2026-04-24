import {
  Save,
  Mail,
  Server,
  Shield,
  Sliders,
  Bell,
  Monitor,
  Clock,
  Database,
  Globe,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui";
import { Switch } from "@ecoctrl/ui";
import { cn } from "@/lib/utils";

import type { SystemConfig } from "@ecoctrl/shared";
import { systemConfigApi } from "../api/systemConfig";

interface SectionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: SectionDef[] = [
  { id: "general", label: "通用设置", icon: <Sliders size={14} /> },
  { id: "display", label: "通知与显示", icon: <Bell size={14} /> },
  { id: "email", label: "邮件服务", icon: <Mail size={14} /> },
  { id: "data", label: "数据与安全", icon: <Database size={14} /> },
];

export default function SystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("general");

  const generalRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    general: generalRef,
    display: displayRef,
    email: emailRef,
    data: dataRef,
  };

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await systemConfigApi.get();
        setConfig(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      let current = sections[0].id;

      for (const s of sections) {
        const el = sectionRefs[s.id].current;
        if (el) {
          const elTop = el.getBoundingClientRect().top;
          if (elTop <= containerTop + 64) {
            current = s.id;
          }
        }
      }

      setActiveSection(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = sectionRefs[id].current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await systemConfigApi.update(config);
    } catch (err) {
      console.error(err);
      alert("保存配置失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  const currentConfig = config ?? {
    platformName: "",
    refreshInterval: 30,
    realtimeAlertEnabled: false,
    theme: "system" as const,
    timezone: "Asia/Shanghai",
    alertSound: true,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: true,
    autoBackup: true,
    backupRetentionDays: 30,
    sessionTimeout: 30,
  };

  const updateField = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部固定导航 */}
      <div className="bg-background/80 shrink-0 z-20 px-8 pt-2 pb-4 backdrop-blur-sm border-b border-border/50">
        <div className="mx-auto max-w-[1440px] flex gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeSection === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 可滚动内容区 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        <div className="mx-auto max-w-[1440px] px-8 py-6 pb-12 space-y-6">
          {/* 通用设置 */}
          <div id="general" ref={generalRef}>
            <Card className="border-border bg-card overflow-hidden border shadow-sm">
              <CardHeader className="border-border/50 border-b px-6">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-primary" />
                  <CardTitle className="text-foreground text-base font-bold">通用设置</CardTitle>
                </div>
                <CardDescription className="text-xs">平台基础信息与运行参数配置。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pt-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="platform-name"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      平台名称
                    </Label>
                    <Input
                      id="platform-name"
                      value={currentConfig.platformName}
                      onChange={(e) => updateField("platformName", e.target.value)}
                      className="bg-muted/30 border-border focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="refresh-interval"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      数据刷新间隔 (秒)
                    </Label>
                    <Select
                      value={String(currentConfig.refreshInterval)}
                      onValueChange={(v) => updateField("refreshInterval", Number(v))}
                    >
                      <SelectTrigger id="refresh-interval" className="bg-muted/30 border-border">
                        <SelectValue placeholder="请选择" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 秒</SelectItem>
                        <SelectItem value="30">30 秒</SelectItem>
                        <SelectItem value="60">1 分钟</SelectItem>
                        <SelectItem value="300">5 分钟</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="timezone"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      系统时区
                    </Label>
                    <div className="relative">
                      <Globe className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Select
                        value={currentConfig.timezone}
                        onValueChange={(v) => updateField("timezone", v)}
                      >
                        <SelectTrigger className="bg-muted/30 border-border pl-10">
                          <SelectValue placeholder="选择时区" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Shanghai">北京时间 (Asia/Shanghai)</SelectItem>
                          <SelectItem value="Asia/Hong_Kong">香港时间 (Asia/Hong_Kong)</SelectItem>
                          <SelectItem value="Asia/Tokyo">东京时间 (Asia/Tokyo)</SelectItem>
                          <SelectItem value="Asia/Singapore">
                            新加坡时间 (Asia/Singapore)
                          </SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 通知与显示 */}
          <div id="display" ref={displayRef}>
            <Card className="border-border bg-card overflow-hidden border shadow-sm">
              <CardHeader className="border-border/50 border-b px-6">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-primary" />
                  <CardTitle className="text-foreground text-base font-bold">通知与显示</CardTitle>
                </div>
                <CardDescription className="text-xs">主题外观与系统通知行为配置。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="theme-mode"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      主题模式
                    </Label>
                    <Select
                      value={currentConfig.theme}
                      onValueChange={(v) => updateField("theme", v as SystemConfig["theme"])}
                    >
                      <SelectTrigger id="theme-mode" className="bg-muted/30 border-border">
                        <SelectValue placeholder="选择主题" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">浅色</SelectItem>
                        <SelectItem value="dark">深色</SelectItem>
                        <SelectItem value="system">跟随系统</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">启用实时告警推送</Label>
                    <p className="text-muted-foreground text-xs">
                      当设备发生严重故障时，系统会自动发送桌面通知。
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.realtimeAlertEnabled}
                    onCheckedChange={(checked) => updateField("realtimeAlertEnabled", checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">告警提示音</Label>
                    <p className="text-muted-foreground text-xs">新告警产生时播放提示音效。</p>
                  </div>
                  <Switch
                    checked={currentConfig.alertSound}
                    onCheckedChange={(checked) => updateField("alertSound", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 邮件服务 */}
          <div id="email" ref={emailRef}>
            <Card className="border-border bg-card overflow-hidden border shadow-sm">
              <CardHeader className="border-border/50 flex flex-row items-center gap-3 border-b px-6">
                <Mail size={18} className="text-primary" />
                <div>
                  <CardTitle className="text-foreground text-base font-bold">
                    邮件通知设置
                  </CardTitle>
                  <CardDescription className="text-xs">
                    配置 SMTP 服务器以支持告警邮件和报表定时发送。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pt-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-host"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      SMTP 服务器地址
                    </Label>
                    <div className="relative">
                      <Server className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="smtp-host"
                        placeholder="smtp.example.com"
                        value={currentConfig.smtpHost}
                        onChange={(e) => updateField("smtpHost", e.target.value)}
                        className="bg-muted/30 border-border pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-port"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      SMTP 端口
                    </Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      placeholder="587"
                      value={currentConfig.smtpPort}
                      onChange={(e) => updateField("smtpPort", Number(e.target.value))}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-user"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      发件人邮箱
                    </Label>
                    <Input
                      id="smtp-user"
                      type="email"
                      placeholder="noreply@example.com"
                      value={currentConfig.smtpUser}
                      onChange={(e) => updateField("smtpUser", e.target.value)}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="smtp-pass"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      密码 / 授权码
                    </Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      placeholder="••••••••"
                      value={currentConfig.smtpPass}
                      onChange={(e) => updateField("smtpPass", e.target.value)}
                      className="bg-muted/30 border-border"
                    />
                  </div>
                </div>

                <div className="border-border/50 flex items-center justify-between border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">使用 SSL / TLS 加密</Label>
                      <p className="text-muted-foreground text-xs">建议开启以保证邮件传输安全。</p>
                    </div>
                  </div>
                  <Switch
                    checked={currentConfig.smtpSecure}
                    onCheckedChange={(checked) => updateField("smtpSecure", checked)}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button variant="outline" size="sm" onClick={() => alert("测试连接功能待实现")}>
                    测试邮件连接
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 数据与安全 */}
          <div id="data" ref={dataRef}>
            <Card className="border-border bg-card overflow-hidden border shadow-sm">
              <CardHeader className="border-border/50 flex flex-row items-center gap-3 border-b px-6">
                <Database size={18} className="text-primary" />
                <div>
                  <CardTitle className="text-foreground text-base font-bold">数据与安全</CardTitle>
                  <CardDescription className="text-xs">
                    自动备份策略与会话安全配置。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">自动备份</Label>
                    <p className="text-muted-foreground text-xs">
                      系统每日凌晨自动备份数据库和配置文件。
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig.autoBackup}
                    onCheckedChange={(checked) => updateField("autoBackup", checked)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="backup-retention"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      备份保留天数
                    </Label>
                    <div className="relative">
                      <Database className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="backup-retention"
                        type="number"
                        min={1}
                        max={365}
                        value={currentConfig.backupRetentionDays}
                        onChange={(e) => updateField("backupRetentionDays", Number(e.target.value))}
                        className="bg-muted/30 border-border pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="session-timeout"
                      className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                    >
                      会话超时 (分钟)
                    </Label>
                    <div className="relative">
                      <Clock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                      <Input
                        id="session-timeout"
                        type="number"
                        min={5}
                        max={240}
                        value={currentConfig.sessionTimeout}
                        onChange={(e) => updateField("sessionTimeout", Number(e.target.value))}
                        className="bg-muted/30 border-border pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部固定保存栏 */}
      <div className="border-border bg-card shrink-0 z-20 flex items-center justify-end gap-3 border-t px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-[1440px] w-full flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-primary hover:bg-primary/90 shadow-primary/20 gap-2 font-semibold text-primary-foreground shadow-sm"
          >
            <Save size={16} />
            {saving ? "保存中..." : "保存所有配置"}
          </Button>
        </div>
      </div>
    </div>
  );
}
