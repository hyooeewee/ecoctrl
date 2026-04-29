import {
  Archive,
  CalendarDays,
  Check,
  Clock,
  Database,
  Eye,
  EyeOff,
  Globe,
  Hash,
  Lock,
  Mail,
  Save,
  Server,
  Shield,
  Sliders,
  Timer,
  Type,
} from "lucide-react";
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
import type { AuthUser } from "../api/auth";

export default function SystemConfig({ user }: { user: AuthUser | null }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

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
    setSaveSuccess(false);
    try {
      await systemConfigApi.update(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("保存配置失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const currentConfig: SystemConfig & { allowOAuthLogin?: boolean } = config ?? {
    platformName: "",
    refreshInterval: 30,
    timezone: "Asia/Shanghai",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpSecure: true,
    autoBackup: true,
    backupRetentionDays: 30,
    sessionTimeout: 30,
    allowRegistration: false,
    allowPasswordReset: false,
    allowOAuthLogin: false,
  };

  const updateField = <K extends keyof SystemConfig>(key: K, value: SystemConfig[K]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isSuperAdmin = user?.role === "super_admin";

  const accessSection = {
    id: "access",
    label: "访问控制",
    icon: Shield,
    description: "控制用户注册、密码重置等功能的可用性。",
    content: (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} />
            <div>
              <Label className="text-sm font-semibold">允许开放注册</Label>
              <p className="text-muted-foreground text-xs">
                关闭后，新用户将无法通过邮箱验证码注册。
              </p>
            </div>
          </div>
          <Switch
            checked={currentConfig.allowRegistration}
            onCheckedChange={(checked) => updateField("allowRegistration", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} />
            <div>
              <Label className="text-sm font-semibold">允许密码重置</Label>
              <p className="text-muted-foreground text-xs">关闭后，用户无法使用"忘记密码"功能。</p>
            </div>
          </div>
          <Switch
            checked={currentConfig.allowPasswordReset}
            onCheckedChange={(checked) => updateField("allowPasswordReset", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} />
            <div>
              <Label className="text-sm font-semibold">允许第三方认证登录</Label>
              <p className="text-muted-foreground text-xs">
                关闭后，用户无法使用微信、企业微信、飞书、钉钉等第三方账号登录。
              </p>
            </div>
          </div>
          <Switch
            checked={currentConfig.allowOAuthLogin}
            onCheckedChange={(checked) =>
              setConfig((prev) =>
                prev ? ({ ...prev, allowOAuthLogin: checked } as SystemConfig) : prev,
              )
            }
          />
        </div>
      </div>
    ),
  };

  const sections = [
    {
      id: "general",
      label: "通用设置",
      icon: Sliders,
      description: "平台基础信息与运行参数配置。",
      content: (
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Type size={18} />
              <div>
                <Label className="text-sm font-semibold">平台名称</Label>
                <p className="text-muted-foreground text-xs">设置系统显示名称。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Input
                value={currentConfig.platformName}
                onChange={(e) => updateField("platformName", e.target.value)}
                className="bg-muted/30 border-border"
              />
            </div>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Timer size={18} />
              <div>
                <Label className="text-sm font-semibold">数据刷新间隔</Label>
                <p className="text-muted-foreground text-xs">控制页面数据自动刷新频率。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={String(currentConfig.refreshInterval)}
                onValueChange={(v) => updateField("refreshInterval", Number(v))}
                items={{ "10": "10 秒", "30": "30 秒", "60": "1 分钟", "300": "5 分钟" }}
              >
                <SelectTrigger className="bg-muted/30 border-border h-10 w-full">
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
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Globe size={18} />
              <div>
                <Label className="text-sm font-semibold">系统时区</Label>
                <p className="text-muted-foreground text-xs">选择平台使用的默认时区。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={currentConfig.timezone}
                onValueChange={(v) => updateField("timezone", v)}
                items={{
                  "Asia/Shanghai": "北京时间",
                  "Asia/Hong_Kong": "香港时间",
                  "Asia/Tokyo": "东京时间",
                  "Asia/Singapore": "新加坡时间",
                  UTC: "UTC",
                }}
              >
                <SelectTrigger className="bg-muted/30 border-border h-10 w-full">
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
      id: "email",
      label: "邮件服务",
      icon: Mail,
      description: "配置 SMTP 服务器以支持告警邮件和报表定时发送。",
      content: (
        <div className="space-y-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Server size={18} />
              <div>
                <Label className="text-sm font-semibold">SMTP 服务器地址</Label>
                <p className="text-muted-foreground text-xs">邮件服务器主机名或 IP。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Input
                placeholder="smtp.example.com"
                value={currentConfig.smtpHost}
                onChange={(e) => updateField("smtpHost", e.target.value)}
                className="bg-muted/30 border-border"
              />
            </div>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Hash size={18} />
              <div>
                <Label className="text-sm font-semibold">SMTP 端口</Label>
                <p className="text-muted-foreground text-xs">常用端口 25、587 或 465。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Input
                type="number"
                placeholder="587"
                value={currentConfig.smtpPort}
                onChange={(e) => updateField("smtpPort", Number(e.target.value))}
                className="bg-muted/30 border-border"
              />
            </div>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Mail size={18} />
              <div>
                <Label className="text-sm font-semibold">发件人邮箱</Label>
                <p className="text-muted-foreground text-xs">系统发送邮件使用的地址。</p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Input
                type="email"
                placeholder="noreply@example.com"
                value={currentConfig.smtpUser}
                onChange={(e) => updateField("smtpUser", e.target.value)}
                className="bg-muted/30 border-border"
              />
            </div>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Lock size={18} />
              <div>
                <Label className="text-sm font-semibold">密码 / 授权码</Label>
                <p className="text-muted-foreground text-xs">SMTP 认证密码或应用授权码。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              {/* Use type="text" with WebkitTextSecurity to avoid Chrome password-form warnings for non-login fields. */}
              <Input
                type="text"
                placeholder="••••••••"
                value={currentConfig.smtpPass}
                onChange={(e) => updateField("smtpPass", e.target.value)}
                className="bg-muted/30 border-border pr-10"
                style={{ WebkitTextSecurity: showSmtpPass ? "none" : "disc" }}
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="border-border/50 flex items-center justify-between border-t pt-6">
            <div className="flex items-center gap-3">
              <Shield size={18} />
              <div>
                <Label className="text-sm font-semibold">使用 SSL / TLS 加密</Label>
                <p className="text-muted-foreground text-xs">建议开启以保证邮件传输安全。</p>
              </div>
            </div>
            <Switch
              checked={currentConfig.smtpSecure}
              onCheckedChange={(checked) => updateField("smtpSecure", checked)}
            />
          </div>
          <div className="flex justify-end">
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
            <div className="flex items-center gap-3">
              <Archive size={18} />
              <div>
                <Label className="text-sm font-semibold">自动备份</Label>
                <p className="text-muted-foreground text-xs">
                  系统每日凌晨自动备份数据库和配置文件。
                </p>
              </div>
            </div>
            <Switch
              checked={currentConfig.autoBackup}
              onCheckedChange={(checked) => updateField("autoBackup", checked)}
            />
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} />
              <div>
                <Label className="text-sm font-semibold">备份保留天数</Label>
                <p className="text-muted-foreground text-xs">超过天数的旧备份将被自动清理。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <Input
                type="number"
                min={1}
                max={365}
                value={currentConfig.backupRetentionDays}
                onChange={(e) => updateField("backupRetentionDays", Number(e.target.value))}
                className="bg-muted/30 border-border pr-12"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                天
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Clock size={18} />
              <div>
                <Label className="text-sm font-semibold">会话超时</Label>
                <p className="text-muted-foreground text-xs">无操作后自动登出的时间。</p>
              </div>
            </div>
            <div className="relative w-full sm:w-48">
              <Input
                type="number"
                min={5}
                max={240}
                value={currentConfig.sessionTimeout}
                onChange={(e) => updateField("sessionTimeout", Number(e.target.value))}
                className="bg-muted/30 border-border pr-14"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                分钟
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ].concat(isSuperAdmin ? [accessSection] : []);

  const actions = (
    <div className="flex items-center justify-end gap-3">
      {saveSuccess && (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <Check size={16} />
          保存成功
        </span>
      )}
      <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
        <Save size={16} />
        {saving ? "保存中..." : "保存所有配置"}
      </Button>
    </div>
  );

  return <SettingsPage sections={sections} loading={loading} actions={actions} />;
}
