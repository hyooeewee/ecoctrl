// ========================================
// Advanced management page
// ========================================
//
// Shows a password form and submits the credentials directly to the embedded
// application's form-based login endpoint. The iframe then loads the login
// response, which either redirects to the app on success or shows the login
// error page on failure.

import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
} from "@ecoctrl/ui";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const IFRAME_NAME = "advanced-management-frame";

// Always use same-origin relative path — Fastify's /api/webtalk proxy forwards
// to the upstream server, so the iframe never leaves our domain.
const LOGIN_URL = "/api/webtalk/_cur/loginA.php";
const LOGIN_TIMEOUT_MS = 10_000;

export default function AdvancedManagement() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cleanup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (formContainerRef.current) {
      formContainerRef.current.innerHTML = "";
    }
  };

  const resetForm = () => {
    cleanup();
    setSubmitted(false);
    setIsLoading(false);
    setIsSubmitting(false);
  };

  const handleIframeLoad = () => {
    if (!iframeRef.current) return;

    try {
      const href = iframeRef.current.contentWindow?.location.href ?? "";
      if (href.includes("runframe.php")) {
        setIsLoading(false);
        cleanup();
      }
    } catch (err) {
      // The iframe may still be cross-origin in some deployment scenarios;
      // fall back to hiding the spinner on any load event.
      console.error("[AdvancedManagement] failed to read iframe location:", err);
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const user = username.trim();
    const pwd = password.trim();

    if (!user || !pwd) {
      setError("请输入用户名和密码");
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    setSubmitted(true);

    // Remove any leftover form from a previous attempt.
    if (formContainerRef.current) {
      formContainerRef.current.innerHTML = "";
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = LOGIN_URL;
    form.target = IFRAME_NAME;
    form.style.display = "none";

    const userInput = document.createElement("input");
    userInput.type = "hidden";
    userInput.name = "userID";
    userInput.value = user;
    form.appendChild(userInput);

    const pwdInput = document.createElement("input");
    pwdInput.type = "hidden";
    pwdInput.name = "pwdID";
    pwdInput.value = password;
    form.appendChild(pwdInput);

    formContainerRef.current?.appendChild(form);
    form.submit();

    timeoutRef.current = setTimeout(() => {
      try {
        const href = iframeRef.current?.contentWindow?.location.href ?? "";
        if (!href.includes("runframe.php")) {
          setError("登录失败，请检查用户名和密码");
          resetForm();
        }
      } catch (err) {
        console.error("[AdvancedManagement] login timeout check failed:", err);
        setError("登录状态检查失败，请重试");
        resetForm();
      }
    }, LOGIN_TIMEOUT_MS);

    setIsSubmitting(false);
  };

  return (
    <div className="bg-background relative h-full overflow-hidden">
      <div ref={formContainerRef} className="hidden" />

      <iframe
        ref={iframeRef}
        allow="fullscreen"
        className={cn(
          "h-full w-full border-0 transition-opacity",
          submitted ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
        )}
        name={IFRAME_NAME}
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-forms"
        src="about:blank"
        title="高级管理"
      />

      {submitted && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-muted-foreground text-sm">登录中...</div>
        </div>
      )}

      {!submitted && (
        <div className="flex h-full items-center justify-center p-8">
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
                  <InputGroup>
                    <InputGroupInput
                      autoComplete="current-password"
                      id="am-password"
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        onClick={() => setShowPassword((v) => !v)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
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
      )}
    </div>
  );
}
