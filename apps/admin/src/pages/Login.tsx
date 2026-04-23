import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, Mail, RotateCcw, UserPlus } from "lucide-react";
import React, { useState, useEffect } from "react";

import { Button, Input, Label, Switch } from "@ecoctrl/ui";

import { authApi } from "../api/auth";
import type { AuthUser } from "../api/auth";
import { BrandLogo } from "../components/BrandLogo";

interface LoginProps {
  onLogin: (user: AuthUser) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");

  // Login fields
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Forgot password fields
  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [showFpNewPwd, setShowFpNewPwd] = useState(false);
  const [showFpConfirm, setShowFpConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchMode = (m: "login" | "register" | "forgot-password") => {
    setMode(m);
    setError("");
  };

  // Countdown timer for verification code
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await authApi.login(loginUsername, loginPassword, remember);
      localStorage.setItem("accessToken", res.accessToken);
      localStorage.setItem("refreshToken", res.refreshToken);
      const user = await authApi.me();
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (regPassword !== regConfirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (regPassword.length < 6) {
      setError("密码长度至少 6 位");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.register(regUsername, regEmail, regPassword);
      localStorage.setItem("accessToken", res.accessToken);
      localStorage.setItem("refreshToken", res.refreshToken);
      const user = await authApi.me();
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCode = async () => {
    if (!fpEmail.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await authApi.sendVerifyCode(fpEmail.trim());
      setCountdown(60);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送验证码失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fpEmail.trim() || !fpCode.trim() || !fpNewPassword || !fpConfirm) {
      setError("请填写所有字段");
      return;
    }
    if (fpNewPassword !== fpConfirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (fpNewPassword.length < 6) {
      setError("密码长度至少 6 位");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(fpEmail.trim(), fpCode.trim(), fpNewPassword);
      alert("密码重置成功，请使用新密码登录");
      setFpEmail("");
      setFpCode("");
      setFpNewPassword("");
      setFpConfirm("");
      switchMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "密码重置失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/20";

  const toggleBtnClass =
    "absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white/70 transition-colors hover:bg-white/30 hover:text-white";

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.jpg')" }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-[1440px] px-6 py-12">
        {/* Left side: auth card */}
        <div className="w-full max-w-md">
          {/* Glass card */}
          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl">
            {/* Brand */}
            <div className="mb-6 flex items-center gap-3">
              <BrandLogo size={36} className="shrink-0 text-white" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">EcoCtrl</h1>
                <p className="text-xs font-medium tracking-wider text-white/60">能管平台</p>
              </div>
            </div>

            {/* Mode toggle — hidden when forgot-password */}
            {mode !== "forgot-password" && (
              <div className="mb-6 flex rounded-full border border-white/20 bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-all ${
                    mode === "login"
                      ? "bg-white/90 text-slate-900"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-all ${
                    mode === "register"
                      ? "bg-white/90 text-slate-900"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  注册
                </button>
              </div>
            )}

            {/* Back link for forgot-password */}
            {mode === "forgot-password" && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <ArrowLeft size={14} />
                  返回登录
                </button>
              </div>
            )}

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {mode === "login" && "欢迎回来"}
                {mode === "register" && "创建账户"}
                {mode === "forgot-password" && "重置密码"}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                {mode === "login" && "请登录您的账户以继续"}
                {mode === "register" && "填写以下信息完成注册"}
                {mode === "forgot-password" && "验证邮箱后设置新密码"}
              </p>
            </div>

            {/* Form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    用户名
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="请输入密码"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={toggleBtnClass}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="remember" checked={remember} onCheckedChange={setRemember} />
                    <Label htmlFor="remember" className="cursor-pointer text-xs text-white/70">
                      记住我
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-password")}
                    className="text-xs text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                  >
                    忘记密码？
                  </button>
                </div>

                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full gap-2 bg-white/90 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-50"
                >
                  <LogIn size={16} />
                  {isSubmitting ? "登录中..." : "登录"}
                </Button>
              </form>
            )}

            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="reg-username"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    用户名
                  </Label>
                  <Input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reg-email"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    邮箱
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reg-password"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="至少 6 位字符"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className={toggleBtnClass}
                    >
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reg-confirm"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    确认密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm"
                      type={showRegConfirm ? "text" : "password"}
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="再次输入密码"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className={toggleBtnClass}
                    >
                      {showRegConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full gap-2 bg-white/90 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-50"
                >
                  <UserPlus size={16} />
                  {isSubmitting ? "注册中..." : "注册"}
                </Button>
              </form>
            )}

            {mode === "forgot-password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="fp-email"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    注册邮箱
                  </Label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      id="fp-email"
                      type="email"
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      placeholder="请输入注册邮箱"
                      className={`${inputClass} pl-10 pr-[108px]`}
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || isSubmitting}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-opacity hover:bg-white disabled:opacity-50"
                    >
                      {countdown > 0 ? `${countdown}s` : "获取验证码"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fp-code"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    验证码
                  </Label>
                  <div className="relative">
                    <KeyRound
                      size={16}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-white/40"
                    />
                    <Input
                      id="fp-code"
                      type="text"
                      value={fpCode}
                      onChange={(e) => setFpCode(e.target.value)}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fp-new-password"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    新密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="fp-new-password"
                      type={showFpNewPwd ? "text" : "password"}
                      value={fpNewPassword}
                      onChange={(e) => setFpNewPassword(e.target.value)}
                      placeholder="至少 6 位字符"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFpNewPwd(!showFpNewPwd)}
                      className={toggleBtnClass}
                    >
                      {showFpNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fp-confirm"
                    className="text-xs font-semibold tracking-wider text-white/80"
                  >
                    确认新密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="fp-confirm"
                      type={showFpConfirm ? "text" : "password"}
                      value={fpConfirm}
                      onChange={(e) => setFpConfirm(e.target.value)}
                      placeholder="再次输入新密码"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFpConfirm(!showFpConfirm)}
                      className={toggleBtnClass}
                    >
                      {showFpConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full gap-2 bg-white/90 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  {isSubmitting ? "处理中..." : "重置密码"}
                </Button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-white/40">EcoCtrl 能管平台 v1.0</div>
          </div>
        </div>

        {/* Right side: empty space letting the building show through */}
        <div className="hidden flex-1 lg:block" />
      </div>
    </div>
  );
}
