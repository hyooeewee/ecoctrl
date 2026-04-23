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
} from "lucide-react";

import { Button } from "@ecoctrl/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@ecoctrl/ui";
import { Badge } from "@ecoctrl/ui";

import { authApi } from "@/api/auth";
import { usersApi } from "@/api/users";
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

export default function Profile() {
  const [currentUser, setCurrentUser] = useState<Pick<User, "username" | "avatarUrl"> | null>(null);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await authApi.me();
        setCurrentUser(me);

        const allUsers = await usersApi.list();
        const detail = allUsers.find((u) => u.username === me.username) ?? null;
        if (detail) {
          // User is currently logged in (this page is reachable), force online status
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
  }, []);

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
      // Re-fetch user details from server to get the real avatarUrl
      const allUsers = await usersApi.list();
      const detail = allUsers.find((u) => u.username === userDetail.username) ?? null;
      if (detail) {
        detail.status = "online";
        setUserDetail(detail);
        setEditAvatarUrl(detail.avatarUrl ?? "");
        setCurrentUser({
          username: detail.username,
          avatarUrl: detail.avatarUrl ?? null,
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  const statusInfo = getStatus(userDetail?.status ?? "offline");
  const avatarSrc =
    editAvatarUrl ||
    userDetail?.avatarUrl ||
    `https://avatar.vercel.sh/${currentUser?.username ?? "admin"}?size=80`;

  return (
    <div className="space-y-6">
      {/* Avatar header */}
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
          {/* Camera icon */}
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
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${statusInfo.color}`}
              />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Basic info — editable */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <UserIcon size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">基本信息</CardTitle>
          </div>
          <CardDescription className="text-xs">编辑您的个人资料，更改将立即生效。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
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
        </CardContent>
      </Card>

      {/* Security — password */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">安全设置</CardTitle>
          </div>
          <CardDescription className="text-xs">修改您的登录密码。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
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
        </CardContent>
      </Card>

      {/* Account info — read-only */}
      <Card className="border-border bg-card overflow-hidden border shadow-sm">
        <CardHeader className="border-border/50 border-b px-6">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <CardTitle className="text-foreground text-base font-bold">账户信息</CardTitle>
          </div>
          <CardDescription className="text-xs">账户权限与安全相关信息，仅供查看。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pt-6">
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
        </CardContent>
      </Card>
    </div>
  );
}
