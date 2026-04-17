import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { User } from "../types";

interface UserSheetProps {
  mode: "create" | "edit";
  user?: User;
  trigger: React.ReactElement;
  onSave: (user: User) => void;
}

export default function UserSheet({ mode, user, trigger, onSave }: UserSheetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<User["status"]>("active");

  useEffect(() => {
    if (open && mode === "edit" && user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
    } else if (open && mode === "create") {
      setName("");
      setEmail("");
      setRole("");
      setStatus("active");
    }
  }, [open, mode, user]);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !role.trim()) return;

    if (mode === "edit" && user) {
      onSave({ ...user, name: name.trim(), email: email.trim(), role: role.trim(), status });
    } else {
      const lastLogin = "-";
      onSave({
        id: Date.now().toString(),
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        status,
        lastLogin,
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
        <div className="grid gap-4 py-6 px-4">
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-name`}>姓名</Label>
            <Input
              id={`${mode}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入真实姓名"
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
            <Input
              id={`${mode}-role`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="运维工程师"
            />
          </div>
          <div className="grid space-y-2">
            <Label htmlFor={`${mode}-status`}>状态</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant={status === "active" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStatus("active")}
              >
                在线
              </Button>
              <Button
                type="button"
                variant={status === "inactive" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStatus("inactive")}
              >
                离线
              </Button>
            </div>
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
