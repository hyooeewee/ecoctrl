import { Eye, EyeOff, LogIn } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@ecoctrl/ui";
import { Input } from "@ecoctrl/ui";
import { Label } from "@ecoctrl/ui";
import { Switch } from "@ecoctrl/ui";

import { BrandLogo } from "../components/BrandLogo";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with auth API
    console.log({ username, password, remember });
    onLogin();
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.jpg')" }}
      />

      {/* Gradient overlay — left side darker for form readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-[1440px] px-6 py-12">
        {/* Left side: login card */}
        <div className="w-full max-w-md">
          {/* Glass card */}
          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl">
            {/* Brand */}
            <div className="mb-8 flex items-center gap-3">
              <BrandLogo size={36} className="shrink-0 text-white" />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">EcoCtrl</h1>
                <p className="text-xs font-medium tracking-wider text-white/60">能管平台</p>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">欢迎回来</h2>
              <p className="mt-1 text-sm text-white/60">请登录您的账户以继续</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="h-11 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/20"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="h-11 border-white/20 bg-white/10 pr-10 text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                <a
                  href="#"
                  className="text-xs text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                >
                  忘记密码？
                </a>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 bg-white/90 text-sm font-semibold text-slate-900 hover:bg-white"
              >
                <LogIn size={16} />
                登录
              </Button>
            </form>

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
