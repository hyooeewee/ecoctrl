import { useState } from "react";
import { Link2, UserPlus, Loader2 } from "lucide-react";

import { Button } from "@ecoctrl/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";

import { oauthApi } from "@/api/oauth";

interface OAuthBindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindPayload: { provider: string; providerUserId: string; tempToken: string } | null;
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void;
  onError?: (message: string) => void;
}

type BindMode = "bind" | "register";

export default function OAuthBindDialog({
  open,
  onOpenChange,
  bindPayload,
  onSuccess,
  onError,
}: OAuthBindDialogProps) {
  const [mode, setMode] = useState<BindMode>("bind");

  // Bind existing account fields
  const [bindUsername, setBindUsername] = useState("");
  const [bindPassword, setBindPassword] = useState("");

  // Register new account fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const resetFields = () => {
    setBindUsername("");
    setBindPassword("");
    setRegUsername("");
    setRegEmail("");
    setMode("bind");
    setLoading(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetFields();
    onOpenChange(val);
  };

  const handleBind = async () => {
    if (!bindPayload) return;
    if (!bindUsername.trim() || !bindPassword.trim()) {
      onError?.("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      const tokens = await oauthApi.bindAccount({
        provider: bindPayload.provider,
        providerUserId: bindPayload.providerUserId,
        tempToken: bindPayload.tempToken,
        username: bindUsername.trim(),
        password: bindPassword.trim(),
      });
      resetFields();
      onOpenChange(false);
      onSuccess(tokens);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "绑定失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!bindPayload) return;
    if (!regUsername.trim() || !regEmail.trim()) {
      onError?.("请输入用户名和邮箱");
      return;
    }

    setLoading(true);
    try {
      const tokens = await oauthApi.registerAndBind({
        provider: bindPayload.provider,
        providerUserId: bindPayload.providerUserId,
        tempToken: bindPayload.tempToken,
        username: regUsername.trim(),
        email: regEmail.trim(),
      });
      resetFields();
      onOpenChange(false);
      onSuccess(tokens);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">关联账号</DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground">
          该第三方账号尚未关联系统账户，请选择以下方式继续
        </p>

        {/* Mode toggle */}
        <div className="flex rounded-lg border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setMode("bind")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${
              mode === "bind"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 size={14} />
            绑定已有账号
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${
              mode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus size={14} />
            注册新账号
          </button>
        </div>

        {mode === "bind" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider">用户名</Label>
              <Input
                value={bindUsername}
                onChange={(e) => setBindUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider">密码</Label>
              <Input
                type="password"
                value={bindPassword}
                onChange={(e) => setBindPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>
            <Button className="w-full" disabled={loading} onClick={handleBind}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {loading ? "绑定中..." : "绑定并登录"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider">用户名</Label>
              <Input
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider">邮箱</Label>
              <Input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
            <Button className="w-full" disabled={loading} onClick={handleRegister}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? "注册中..." : "注册并登录"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
