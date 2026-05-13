import React, { useState, useEffect } from "react";

import { Button } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@ecoctrl/ui";

import type { User, UserRole } from "@ecoctrl/shared";
import { USER_ROLE_LIST } from "@ecoctrl/shared";

interface UserSheetProps {
  mode: "create" | "edit";
  user?: User;
  trigger: React.ReactElement;
  onSave: (user: User) => void;
}

const STATUS_LABELS: Record<User["status"], string> = {
  online: "在线",
  offline: "离线",
  disabled: "禁用",
  busy: "繁忙",
};

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  operator: "运维工程师",
  analyst: "分析师",
  viewer: "查看员",
};

const VALID_STATUSES: User["status"][] = new Set(["online", "offline", "disabled", "busy"]);

function normalizeStatus(s: string): User["status"] {
  return VALID_STATUSES.has(s as User["status"]) ? (s as User["status"]) : "offline";
}

function normalizeRole(s: string): UserRole {
  return USER_ROLE_LIST.includes(s as UserRole) ? (s as UserRole) : "viewer";
}

export default function UserSheet({ mode, user, trigger, onSave }: UserSheetProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<User["status"]>("online");

  useEffect(() => {
    if (open && mode === "edit" && user) {
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      setStatus(normalizeStatus(user.status));
    } else if (open && mode === "create") {
      setUsername("");
      setEmail("");
      setRole("viewer");
      setStatus("online");
    }
  }, [open, mode, user]);

  const handleSubmit = () => {
    if (!username.trim() || !email.trim() || !role.trim()) return;

    if (mode === "edit" && user) {
      onSave({
        ...user,
        username: username.trim(),
        email: email.trim(),
        role: normalizeRole(role.trim()),
        status,
      });
    } else {
      const lastLogin = "-";
      onSave({
        id: Date.now().toString(),
        username: username.trim(),
        email: email.trim(),
        role: normalizeRole(role.trim()),
        status,
        lastLogin,
        avatarUrl: null,
      });
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "编辑账户" : "创建新账户"}</SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "修改账户信息。在提交前请确保已分配正确的角色。"
              : "为系统添加新用户。在提交前请确保已分配正确的角色。"}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 py-6">
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-name`}>用户名</Label>
            <Input
              id={`${mode}-name`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-email`}>邮箱地址</Label>
            <Input
              id={`${mode}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@energy.com"
            />
          </div>
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-role`}>角色</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "")}>
              <SelectTrigger id={`${mode}-role`}>
                <SelectValue placeholder="选择角色">
                  {role ? ROLE_LABELS[role as UserRole] : ""}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {USER_ROLE_LIST.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-status`}>状态</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as User["status"])}>
              <SelectTrigger id={`${mode}-status`}>
                <SelectValue placeholder="选择状态">{STATUS_LABELS[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">在线</SelectItem>
                <SelectItem value="offline">离线</SelectItem>
                <SelectItem value="disabled">禁用</SelectItem>
                <SelectItem value="busy">繁忙</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button type="button" className="w-full" onClick={handleSubmit}>
            {mode === "edit" ? "保存修改" : "确认创建"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
