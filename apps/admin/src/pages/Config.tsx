import { Save, Mail, Server, Shield, Sliders, Bell, Clock, Database, Globe } from "lucide-react";
import React, { useEffect, useState } from "react";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@ecoctrl/ui";
import SettingsPage from "@/components/SettingsPage";

import type { SystemConfig } from "@ecoctrl/shared";
import { systemConfigApi } from "../api/systemConfig";

export default function SystemConfig() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const sections = [
    {
      id: "general",
      label: "通用设置",
      icon: Sliders,
      description: "平台基础信息与运行参数配置。",
      content: (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              平台名称
            </Label>
            <Input
              value={currentConfig.platformName}
              onChange={(e) => updateField("platformName", e.target.value)}
              className="bg-muted/30 border-border focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              数据刷新间隔 (秒)
            </Label>
            <Select
              value={String(currentConfig.refreshInterval)}
              onValueChange={(v) => updateField("refreshInterval", Number(v))}
            >
              <SelectTrigger className="bg-muted/30 border-border">
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
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
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
                  <SelectItem value="Asia/Singapore">新加坡时间 (Asia/Singapore)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "display",
      label: "通知与显示",
      icon: Bell,
      description: "主题外观与系统通知行为配置。",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                主题模式
              </Label>
              <Select
                value={currentConfig.theme}
                onValueChange={(v) => updateField("theme", v as SystemConfig["theme"])}
              >
                <SelectTrigger className="bg-muted/30 border-border">
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
        </div>
      ),
    },
    {
      id: "email",
      label: "邮件服务",
      icon: Mail,
      description: "配置 SMTP 服务器以支持告警邮件和报表定时发送。",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                SMTP 服务器地址
              </Label>
              <div className="relative">
                <Server className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  placeholder="smtp.example.com"
                  value={currentConfig.smtpHost}
                  onChange={(e) => updateField("smtpHost", e.target.value)}
                  className="bg-muted/30 border-border pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                SMTP 端口
              </Label>
              <Input
                type="number"
                placeholder="587"
                value={currentConfig.smtpPort}
                onChange={(e) => updateField("smtpPort", Number(e.target.value))}
                className="bg-muted/30 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                发件人邮箱
              </Label>
              <Input
                type="email"
                placeholder="noreply@example.com"
                value={currentConfig.smtpUser}
                onChange={(e) => updateField("smtpUser", e.target.value)}
                className="bg-muted/30 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                密码 / 授权码
              </Label>
              <Input
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
        </div>
      ),
    },
    {
      id: "data",
      label: "数据与安全",
      icon: Database,
      description: "自动备份策略与会话安全配置。",
      content: (
        <div className="space-y-6">
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
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                备份保留天数
              </Label>
              <div className="relative">
                <Database className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
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
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                会话超时 (分钟)
              </Label>
              <div className="relative">
                <Clock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
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
        </div>
      ),
    },
  ];

  const actions = (
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
        <Save size={16} />
        {saving ? "保存中..." : "保存所有配置"}
      </Button>
    </div>
  );

  return <SettingsPage sections={sections} loading={loading} actions={actions} />;
}
