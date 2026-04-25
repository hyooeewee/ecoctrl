/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import {
  Save,
  User as UserIcon,
  Mail,
  Shield,
  Activity,
  Clock,
  Camera,
  Fingerprint,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Link2,
  Unlink,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";

import { authApi } from "@/api/auth";
import { oauthApi, type LinkedOAuthAccount } from "@/api/oauth";
import { usersApi } from "@/api/users";
import AppButton from "@/components/AppButton";
import OAuthButtons from "@/components/OAuthButtons";
import SettingsPage from "@/components/SettingsPage";
import type { SettingsSection } from "@/components/SettingsPage";
import { wechatIcon, wecomIcon, feishuIcon, dingtalkIcon } from "@/assets/icons";
import { useAvatar } from "@/hooks/useAvatar";
import type { User, UserRole } from "@ecoctrl/shared";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  operator: "运维工程师",
  analyst: "分析师",
  viewer: "查看员",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  online: { label: "在线", color: "bg-green-500" },
  offline: { label: "离线", color: "bg-muted-foreground" },
  disabled: { label: "禁用", color: "bg-red-500" },
  busy: { label: "繁忙", color: "bg-orange-500" },
};

function getStatus(status: string) {
  return STATUS_MAP[status] ?? STATUS_MAP.offline;
}

function formatDateTime(value: string | null): string {
  if (!value) return "暂无记录";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}年${mm}月${dd}日 ${hh}:${MM}`;
}

interface ProviderMeta {
  name: string;
  color: string;
  bg: string;
  icon: string;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  wechat: { name: "微信", color: "#07C160", bg: "bg-[#07C160]/10", icon: wechatIcon },
  wecom: { name: "企业微信", color: "#2BAD31", bg: "bg-[#2BAD31]/10", icon: wecomIcon },
  feishu: { name: "飞书", color: "#3370FF", bg: "bg-[#3370FF]/10", icon: feishuIcon },
  dingtalk: { name: "钉钉", color: "#0089FF", bg: "bg-[#0089FF]/10", icon: dingtalkIcon },
};

export default function Profile() {
  const [currentUser, setCurrentUser] = useState<{
    username: string;
    avatarUrl: string | null;
    authType?: "password" | "oauth";
    provider?: string;
  } | null>(null);
  const [userDetail, setUserDetail] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [linkedAccounts, setLinkedAccounts] = useState<LinkedOAuthAccount[]>([]);
  const [oauthLoading, setOauthLoading] = useState(true);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // Email binding states (for OAuth users)
  const [bindEmailInput, setBindEmailInput] = useState("");
  const [bindEmailCode, setBindEmailCode] = useState("");
  const [bindEmailPassword, setBindEmailPassword] = useState("");
  const [bindEmailCountdown, setBindEmailCountdown] = useState(0);
  const [bindEmailSending, setBindEmailSending] = useState(false);
  const [bindEmailSubmitting, setBindEmailSubmitting] = useState(false);

  const fetchLinkedAccounts = async () => {
    try {
      const data = await oauthApi.getLinkedAccounts();
      setLinkedAccounts(data);
    } catch (err) {
      console.error("Failed to load linked OAuth accounts:", err);
    } finally {
      setOauthLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await authApi.me();
        setCurrentUser(me);

        const allUsers = await usersApi.list();
        const detail = allUsers.find((u) => u.username === me.username) ?? null;
        if (detail) {
          detail.status = "online";
          setUserDetail(detail);
          setEditUsername(detail.username);
          setEditEmail(detail.email);
          setEditAvatarUrl(detail.avatarUrl ?? "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchLinkedAccounts();
  }, []);

  // Countdown for email verification code
  useEffect(() => {
    if (bindEmailCountdown <= 0) return;
    const timer = setTimeout(() => setBindEmailCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [bindEmailCountdown]);

  const handleUnlink = async (provider: string) => {
    if (!confirm(`确定要解除 ${PROVIDER_META[provider]?.name ?? provider} 账号绑定吗？`)) return;
    setUnlinkingProvider(provider);
    try {
      await oauthApi.unlink(provider);
      await fetchLinkedAccounts();
    } catch (err) {
      console.error(err);
      alert("解绑失败，请重试");
    } finally {
      setUnlinkingProvider(null);
    }
  };

  const handleSendBindEmailCode = async () => {
    if (!bindEmailInput.trim()) {
      alert("请输入邮箱地址");
      return;
    }
    setBindEmailSending(true);
    try {
      await authApi.sendBindEmailCode(bindEmailInput.trim());
      setBindEmailCountdown(60);
    } catch (err) {
      alert(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setBindEmailSending(false);
    }
  };

  const handleBindEmail = async () => {
    if (!bindEmailInput.trim() || !bindEmailCode.trim() || !bindEmailPassword) {
      alert("请填写邮箱、验证码和密码");
      return;
    }
    if (bindEmailPassword.length < 6) {
      alert("密码长度至少 6 位");
      return;
    }
    setBindEmailSubmitting(true);
    try {
      await authApi.bindEmail(bindEmailInput.trim(), bindEmailCode.trim(), bindEmailPassword);
      alert("邮箱绑定成功");
      setBindEmailInput("");
      setBindEmailCode("");
      setBindEmailPassword("");
      // Refresh user details to reflect the change
      const me = await authApi.me();
      setCurrentUser(me);
      const allUsers = await usersApi.list();
      const detail = allUsers.find((u) => u.username === me.username) ?? null;
      if (detail) {
        detail.status = "online";
        setUserDetail(detail);
        setEditEmail(detail.email);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "绑定失败，请重试");
    } finally {
      setBindEmailSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!userDetail) return;
    if (!editUsername.trim() || !editEmail.trim()) {
      alert("用户名和邮箱不能为空");
      return;
    }
    setSaving(true);
    try {
      await usersApi.update(userDetail.id, {
        username: editUsername.trim(),
        email: editEmail.trim(),
        avatarUrl: editAvatarUrl.trim() || null,
      });
      setUserDetail((prev) =>
        prev
          ? {
              ...prev,
              username: editUsername.trim(),
              email: editEmail.trim(),
              avatarUrl: editAvatarUrl.trim() || null,
            }
          : prev,
      );
      setCurrentUser({
        username: editUsername.trim(),
        avatarUrl: editAvatarUrl.trim() || null,
        authType: currentUser?.authType,
        provider: currentUser?.provider,
      });
    } catch (err) {
      console.error(err);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userDetail) return;

    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }

    setUploadingAvatar(true);
    try {
      await usersApi.uploadAvatar(userDetail.id, file);
      const allUsers = await usersApi.list();
      const detail = allUsers.find((u) => u.username === userDetail.username) ?? null;
      if (detail) {
        detail.status = "online";
        setUserDetail(detail);
        setEditAvatarUrl(detail.avatarUrl ?? "");
        setCurrentUser({
          username: detail.username,
          avatarUrl: detail.avatarUrl ?? null,
          authType: currentUser?.authType,
          provider: currentUser?.provider,
        });
        window.dispatchEvent(new CustomEvent("avatar:updated", { detail: detail.avatarUrl }));
      }
    } catch (err) {
      console.error(err);
      alert("头像上传失败，请重试");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSavePassword = async () => {
    if (!userDetail) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("请输入原密码、新密码并确认");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      alert("密码长度至少为 6 位");
      return;
    }

    setSavingPwd(true);
    try {
      await usersApi.update(userDetail.id, {
        oldPassword,
        password: newPassword,
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("密码修改成功");
    } catch (err) {
      console.error(err);
      alert("密码修改失败，请检查原密码是否正确");
    } finally {
      setSavingPwd(false);
    }
  };

  const statusInfo = getStatus(userDetail?.status ?? "offline");
  const avatarSrc = useAvatar(userDetail?.id, editAvatarUrl || userDetail?.avatarUrl || null);

  const isOAuthUser = currentUser?.authType === "oauth";

  const header = (
    <div className="flex items-center gap-6">
      <div className="relative">
        <button
          onClick={handleAvatarClick}
          disabled={uploadingAvatar}
          className="relative cursor-pointer rounded-full disabled:cursor-not-allowed"
          title="点击更换头像"
        >
          <Avatar className="ring-muted h-20 w-20 ring-2 ring-offset-2 transition-opacity hover:opacity-80">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="text-lg">
              {(currentUser?.username ?? "Admin").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploadingAvatar}
          className="bg-primary text-primary-foreground border-background absolute -right-0 -bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 disabled:opacity-50"
          title="更换头像"
        >
          <Camera size={12} />
        </button>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {userDetail?.username ?? currentUser?.username ?? "Admin"}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{userDetail?.email ?? "—"}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {userDetail ? ROLE_LABELS[userDetail.role] : "—"}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${statusInfo.color}`} />
            {statusInfo.label}
          </Badge>
          {isOAuthUser && currentUser?.provider && (
            <Badge
              variant="outline"
              className="font-normal"
              style={{
                borderColor: PROVIDER_META[currentUser.provider]?.color ?? "currentColor",
                color: PROVIDER_META[currentUser.provider]?.color ?? "currentColor",
              }}
            >
              {PROVIDER_META[currentUser.provider]?.name ?? currentUser.provider} 登录
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  const basicSection: SettingsSection = {
    id: "basic",
    label: "基本信息",
    icon: UserIcon,
    description: "编辑您的个人资料，更改将立即生效。",
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              用户名
            </Label>
            <div className="relative">
              <UserIcon className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="请输入用户名"
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              邮箱
            </Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="请输入邮箱"
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </div>
    ),
  };

  const securitySection: SettingsSection = {
    id: "security",
    label: "安全设置",
    icon: Lock,
    description: "修改您的登录密码。",
    content: (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              原密码
            </Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                type={showOldPwd ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                autoComplete="current-password"
                className="bg-muted/30 border-border pr-10 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPwd((v) => !v)}
                className="text-muted-foreground hover:text-foreground absolute top-2.5 right-3"
              >
                {showOldPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                新密码
              </Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  autoComplete="new-password"
                  className="bg-muted/30 border-border pr-10 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-2.5 right-3"
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                确认新密码
              </Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                  className="bg-muted/30 border-border pr-10 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-2.5 right-3"
                >
                  {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSavePassword}
            disabled={savingPwd}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {savingPwd ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {savingPwd ? "保存中..." : "修改密码"}
          </Button>
        </div>
      </div>
    ),
  };

  const accountSection: SettingsSection = {
    id: "account",
    label: "账户信息",
    icon: Shield,
    description: "账户权限与安全相关信息，仅供查看。",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            用户 ID
          </Label>
          <div className="relative">
            <Fingerprint className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
            <Input
              value={userDetail?.id ?? ""}
              disabled
              className="bg-muted/30 border-border pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              角色
            </Label>
            <div className="relative">
              <Shield className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                value={userDetail ? ROLE_LABELS[userDetail.role] : ""}
                disabled
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              状态
            </Label>
            <div className="relative">
              <Activity className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                value={statusInfo.label}
                disabled
                className="bg-muted/30 border-border pl-10"
              />
              <span
                className={`absolute top-1/2 right-3 h-2 w-2 -translate-y-1/2 rounded-full ${statusInfo.color}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              最后登录时间
            </Label>
            <div className="relative">
              <Clock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                value={formatDateTime(userDetail?.lastLogin ?? null)}
                disabled
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const bindEmailSection: SettingsSection = {
    id: "bind-email",
    label: "绑定邮箱",
    icon: ShieldCheck,
    description: "绑定邮箱并设置密码后，可使用邮箱密码登录本账户。",
    content: (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              邮箱地址
            </Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                type="email"
                value={bindEmailInput}
                onChange={(e) => setBindEmailInput(e.target.value)}
                placeholder="请输入邮箱"
                className="bg-muted/30 border-border pr-[108px] pl-10"
              />
              <button
                type="button"
                onClick={handleSendBindEmailCode}
                disabled={bindEmailCountdown > 0 || bindEmailSending}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {bindEmailCountdown > 0 ? `${bindEmailCountdown}s` : "获取验证码"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              验证码
            </Label>
            <div className="relative">
              <KeyRound className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                value={bindEmailCode}
                onChange={(e) => setBindEmailCode(e.target.value)}
                placeholder="请输入6位验证码"
                maxLength={6}
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              设置登录密码
            </Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                type="password"
                value={bindEmailPassword}
                onChange={(e) => setBindEmailPassword(e.target.value)}
                placeholder="至少 6 位字符"
                className="bg-muted/30 border-border pl-10"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <AppButton
            level="action"
            onClick={handleBindEmail}
            disabled={bindEmailSubmitting}
            size="sm"
            className="gap-2"
          >
            {bindEmailSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {bindEmailSubmitting ? "绑定中..." : "确认绑定"}
          </AppButton>
        </div>
      </div>
    ),
  };

  const socialSection: SettingsSection = {
    id: "social",
    label: isOAuthUser ? "社交账号" : "账号关联",
    icon: Link2,
    description: isOAuthUser
      ? "管理已绑定的第三方登录账号。"
      : "关联社交账号后，可使用对应平台一键登录。",
    content: (
      <div className="space-y-6">
        {oauthLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 size={16} className="mr-2 animate-spin" />
            加载中...
          </div>
        ) : linkedAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">暂无绑定的第三方账号</p>
            {availableProviders.length > 0 && (
              <p className="text-xs text-muted-foreground/60">点击下方图标绑定新账号</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {linkedAccounts.map((account) => {
              const meta = PROVIDER_META[account.provider];
              const isCurrentLogin = isOAuthUser && currentUser?.provider === account.provider;

              return (
                <div
                  key={account.provider}
                  className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: meta?.color ? `${meta.color}15` : undefined,
                    }}
                  >
                    {meta?.icon ? (
                      <img src={meta.icon} alt={meta.name} className="h-5 w-5" />
                    ) : (
                      <span className="text-xs font-bold">
                        {account.provider.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meta?.name ?? account.provider}</span>
                      {isCurrentLogin && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                          当前登录
                        </Badge>
                      )}
                    </div>
                    {account.providerEmail && (
                      <p className="truncate text-xs text-muted-foreground">
                        {account.providerEmail}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60">
                      绑定于 {formatDateTime(account.createdAt)}
                    </p>
                  </div>
                  {!isCurrentLogin && (
                    <AppButton
                      level="danger"
                      size="sm"
                      className="h-8"
                      disabled={unlinkingProvider === account.provider}
                      onClick={() => handleUnlink(account.provider)}
                    >
                      {unlinkingProvider === account.provider ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Unlink size={14} />
                      )}
                    </AppButton>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {availableProviders.length > 0 && (
          <div className="border-border/50 border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium">
              {linkedAccounts.length === 0 ? "选择平台绑定" : "绑定更多平台"}
            </p>
            <OAuthButtons
              theme="light"
              excludeProviders={linkedAccounts.map((a) => a.provider)}
              onLinked={fetchLinkedAccounts}
              onProvidersLoaded={(providers) => setAvailableProviders(providers.map((p) => p.id))}
            />
          </div>
        )}
      </div>
    ),
  };

  const sections: SettingsSection[] = [
    basicSection,
    ...(!isOAuthUser ? [securitySection] : []),
    accountSection,
    ...(isOAuthUser ? [bindEmailSection] : []),
    socialSection,
  ];

  return <SettingsPage sections={sections} loading={loading} header={header} />;
}
