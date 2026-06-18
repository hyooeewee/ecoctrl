// ========================================
// Advanced management page
// ========================================
//
// Shows a password re-check form, then embeds an iframe and forwards the
// credentials to it via postMessage after the frame loads. The iframe URL is
// read from import.meta.env.ADVANCED_MANAGEMENT_URL.

import React, { useEffect, useRef, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@ecoctrl/ui";
import { LogIn, Shield } from "lucide-react";
import { toast } from "sonner";

import { authApi } from "../api/auth";

const IFRAME_URL = import.meta.env.ADVANCED_MANAGEMENT_URL || "http://localhost:5001/";
const AUTH_SESSION_KEY = "advancedManagementAuth";
const LOGIN_MESSAGE_TYPE = "advanced-login";

function getTargetOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return new URL("http://localhost:5001/").origin;
  }
}

export default function AdvancedManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Restore session-scoped authentication state on mount.
  useEffect(() => {
    const flag = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (flag === "1") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.login(username.trim(), password.trim(), false);
      sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      setIsAuthenticated(true);
      toast.success("高级管理模块登录成功");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "登录失败，请重试";
      const isCredentialError =
        raw.toLowerCase().includes("invalid") || raw.toLowerCase().includes("unauthorized");
      const message = isCredentialError ? "账户或密码错误" : raw;
      setError(message);
      toast.error("登录失败", { description: message });
      console.error("[AdvancedManagement] login failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIframeLoad = () => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow || !username || !password) return;

    const targetOrigin = getTargetOrigin(IFRAME_URL);
    contentWindow.postMessage({ type: LOGIN_MESSAGE_TYPE, username, password }, targetOrigin);
  };

  if (isAuthenticated) {
    return (
      <div className="bg-background flex h-full flex-col overflow-hidden">
        <iframe
          ref={iframeRef}
          allow="fullscreen"
          className="h-full w-full border-0"
          onLoad={handleIframeLoad}
          src={IFRAME_URL}
          title="高级管理"
        />
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-3">
            <Shield className="text-primary h-6 w-6" />
            <CardTitle>高级管理</CardTitle>
          </div>
          <p className="text-muted-foreground text-sm">请输入凭据以访问高级管理模块</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="am-username">用户名</Label>
              <Input
                autoComplete="username"
                id="am-username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                type="text"
                value={username}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="am-password">密码</Label>
              <Input
                autoComplete="current-password"
                id="am-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                type="password"
                value={password}
              />
            </div>
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
                {error}
              </div>
            )}
            <Button className="w-full gap-2" disabled={isSubmitting} type="submit">
              <LogIn size={16} />
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
