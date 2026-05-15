import { Eye, EyeOff, Undo2, ArrowLeft, Loader2, LogOut, Mail, Shield, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Input, Label, Separator, Switch } from "@ecoctrl/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui-adapter/dialog";
import { Slider } from "~/components/ui-adapter/slider";

import { Button } from "~/components/ui-adapter/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui-adapter/select";
import { locale, useLocale } from "~/locales";
import { useAuthStore } from "~/store/auth";
import { useSettingsStore } from "~/store/settings";

import type { Route } from "./+types/settings";

export function meta(_args: Route.MetaArgs) {
  return [{ title: `${locale.nav.settings} — ${locale.meta.title}` }];
}

// Section definition with order preserved
const sectionIds = ["general", "appearance", "layout", "data", "account"] as const;
type SectionId = (typeof sectionIds)[number];

export default function SettingsPage() {
  const t = useLocale();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeId, setActiveId] = useState<SectionId>("general");

  const auth = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const {
    autoRotate,
    rotateSpeed,
    showLabels,
    glowIntensity,
    dataRefreshInterval,
    navHideDelay,
    defaultCameraRadius,
    defaultRotationY,
    language,
    reducedMotion,
    showLoadingAnimation,
    bentoLayout,
    editAutoExitDelay,
    syncStatus,
    hasUnsavedChanges,
    syncDebounceMs,
    setAutoRotate,
    setRotateSpeed,
    setShowLabels,
    setGlowIntensity,
    setDataRefreshInterval,
    setNavHideDelay,
    setDefaultCameraRadius,
    setDefaultRotationY,
    setLanguage,
    setReducedMotion,
    setShowLoadingAnimation,
    setBentoDragEnabled,
    setEditAutoExitDelay,
    resetBentoLayout,
    reset,
    loadSettings,
    flushSync,
    syncSettings,
    setSyncDebounceMs,
  } = useSettingsStore();

  const isLayoutModified = bentoLayout.length > 0;

  // Load server settings on mount (server-side priority, non-blocking).
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Flush any pending sync on unmount.
  useEffect(() => {
    return () => {
      flushSync();
    };
  }, [flushSync]);

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error(t.settings.pleaseEnterEmail);
      return;
    }
    if (!password) {
      toast.error(t.settings.pleaseEnterPassword);
      return;
    }
    setIsLoggingIn(true);
    try {
      await auth.login(email.trim(), password);
      toast.success(t.settings.loginSuccess);
      setPassword("");
      navigate("/");
    } catch {
      toast.error(t.settings.loginError);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const confirmLogout = () => setShowLogoutConfirm(true);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    try {
      await auth.logout();
      toast.success(t.settings.logoutSuccess);
      navigate("/");
    } catch {
      // logout already clears local state on error
      toast.success(t.settings.logoutSuccess);
      navigate("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleReset = () => {
    reset();
    toast.success(t.settings.resetConfirm);
  };

  const handleResetBento = () => {
    resetBentoLayout();
    toast.success(t.settings.bentoResetConfirm);
  };

  // Scroll spy with IntersectionObserver
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;

        const best = entries
          .filter((e) => e.isIntersecting)
          .slice()
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (best) {
          setActiveId(best.target.id as SectionId);
        }
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-40% 0px -40% 0px",
      },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: SectionId) => {
    const root = containerRef.current;
    const el = document.getElementById(id);
    if (!root || !el) return;

    isScrollingRef.current = true;
    setActiveId(id);

    const top = el.offsetTop - 24;
    root.scrollTo({ top, behavior: "smooth" });

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 600);
  };

  const tabItem = (id: SectionId, label: string) => {
    const active = activeId === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => scrollToSection(id)}
        className={[
          "relative w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
          active
            ? "bg-cyber-cyan/10 text-cyber-cyan"
            : "text-foreground/70 hover:bg-white/5 hover:text-foreground",
        ].join(" ")}
      >
        {active && <span className="bg-cyber-cyan absolute inset-y-1 left-0 w-[2px] rounded-r" />}
        {label}
      </button>
    );
  };

  // Save button state helpers
  const isSyncing = syncStatus === "syncing";
  const saveDisabled = !hasUnsavedChanges || isSyncing;
  const saveLabel = isSyncing
    ? t.settings.autoSaving
    : hasUnsavedChanges
      ? t.settings.save
      : t.settings.saved;

  return (
    <div className="dark text-foreground relative h-screen overflow-hidden bg-[#060d18] font-sans">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-foreground/80 hover:text-foreground absolute top-4 left-4 z-30 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="flex h-full">
        {/* Left sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 pt-16 pb-6">
          <div className="px-4 pb-4">
            <h2 className="text-lg font-semibold tracking-tight">{t.settings.title}</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">{t.settings.subtitle}</p>
          </div>

          <nav className="flex flex-col gap-0.5 px-3">
            {tabItem("general", t.settings.general)}
            {tabItem("appearance", t.settings.appearance)}
            {tabItem("layout", t.settings.bentoTitle)}
            {tabItem("data", t.settings.data)}
            {tabItem("account", t.settings.account)}
          </nav>

          <div className="mt-auto px-4 pt-6">
            {/* Save button */}
            <Button
              variant="default"
              size="sm"
              className="mb-2 w-full"
              disabled={saveDisabled}
              onClick={() => {
                if (!saveDisabled) syncSettings();
              }}
            >
              {isSyncing && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {saveLabel}
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
              {t.settings.reset}
            </Button>
          </div>
        </aside>

        {/* Right content */}
        <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth pt-12">
          <div className="mx-auto max-w-2xl px-8 pb-24">
            {/* General */}
            <section id="general" className="py-6">
              <h3 className="mb-5 text-xl font-semibold tracking-tight">{t.settings.general}</h3>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.language}</Label>
                    <p className="text-muted-foreground text-xs">
                      {language === "zh-CN" ? "切换界面显示语言" : "Change the display language"}
                    </p>
                  </div>
                  <Select
                    value={language}
                    onValueChange={(v) => setLanguage(v as "zh-CN" | "en-US")}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>{language === "zh-CN" ? "简体中文" : "English"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.reducedMotion}</Label>
                    <p className="text-muted-foreground text-xs">{t.settings.reducedMotionDesc}</p>
                  </div>
                  <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.showLoadingAnimation}</Label>
                    <p className="text-muted-foreground text-xs">
                      {t.settings.showLoadingAnimationDesc}
                    </p>
                  </div>
                  <Switch
                    checked={showLoadingAnimation}
                    onCheckedChange={setShowLoadingAnimation}
                  />
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* Appearance */}
            <section id="appearance" className="py-6">
              <h3 className="mb-5 text-xl font-semibold tracking-tight">{t.settings.appearance}</h3>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.autoRotate}</Label>
                    <p className="text-muted-foreground text-xs">{t.settings.autoRotateDesc}</p>
                  </div>
                  <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.rotateSpeed}</Label>
                    <span className="text-muted-foreground text-xs">
                      {Math.round(rotateSpeed * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[rotateSpeed]}
                    min={0.1}
                    max={2}
                    step={0.1}
                    onValueChange={(v) => setRotateSpeed(Array.isArray(v) ? v[0] : v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.showLabels}</Label>
                    <p className="text-muted-foreground text-xs">{t.settings.showLabelsDesc}</p>
                  </div>
                  <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.glowIntensity}</Label>
                    <span className="text-muted-foreground text-xs">
                      {Math.round(glowIntensity * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[glowIntensity]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={(v) => setGlowIntensity(Array.isArray(v) ? v[0] : v)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.defaultCameraRadius}</Label>
                    <span className="text-muted-foreground text-xs">{defaultCameraRadius}</span>
                  </div>
                  <Slider
                    value={[defaultCameraRadius]}
                    min={8}
                    max={60}
                    step={1}
                    onValueChange={(v) => setDefaultCameraRadius(Array.isArray(v) ? v[0] : v)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.defaultRotationY}</Label>
                    <span className="text-muted-foreground text-xs">
                      {defaultRotationY}
                      {t.settings.degrees}
                    </span>
                  </div>
                  <Slider
                    value={[defaultRotationY]}
                    min={0}
                    max={360}
                    step={15}
                    onValueChange={(v) => setDefaultRotationY(Array.isArray(v) ? v[0] : v)}
                  />
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* Layout */}
            <section id="layout" className="py-6">
              <h3 className="mb-5 text-xl font-semibold tracking-tight">{t.settings.bentoTitle}</h3>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.bentoTitle}</Label>
                    <p className="text-muted-foreground text-xs">{t.settings.bentoSubtitle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLayoutModified && (
                      <button
                        type="button"
                        onClick={handleResetBento}
                        className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
                      >
                        <Undo2 size={14} />
                        {t.settings.bentoResetLayout}
                      </button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBentoDragEnabled(true);
                        navigate("/");
                      }}
                    >
                      {t.settings.bentoEditLayout}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t.settings.editAutoExitDelay}</Label>
                    <p className="text-muted-foreground text-xs">
                      {t.settings.editAutoExitDelayDesc}
                    </p>
                  </div>
                  <Select
                    value={String(editAutoExitDelay)}
                    onValueChange={(v) => setEditAutoExitDelay(Number(v))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        {editAutoExitDelay === 0 && t.settings.editAutoExitNever}
                        {editAutoExitDelay === 15000 && `15 ${t.settings.seconds}`}
                        {editAutoExitDelay === 30000 && `30 ${t.settings.seconds}`}
                        {editAutoExitDelay === 60000 && "1 min"}
                        {editAutoExitDelay === 120000 && "2 min"}
                        {editAutoExitDelay === 300000 && "5 min"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15000">15 {t.settings.seconds}</SelectItem>
                      <SelectItem value="30000">30 {t.settings.seconds}</SelectItem>
                      <SelectItem value="60000">1 min</SelectItem>
                      <SelectItem value="120000">2 min</SelectItem>
                      <SelectItem value="300000">5 min</SelectItem>
                      <SelectItem value="0">{t.settings.editAutoExitNever}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* Data */}
            <section id="data" className="py-6">
              <h3 className="mb-5 text-xl font-semibold tracking-tight">{t.settings.data}</h3>
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.dataRefreshInterval}</Label>
                    <span className="text-muted-foreground text-xs">
                      {dataRefreshInterval} {t.settings.seconds}
                    </span>
                  </div>
                  <Slider
                    value={[dataRefreshInterval]}
                    min={5}
                    max={120}
                    step={5}
                    onValueChange={(v) => setDataRefreshInterval(Array.isArray(v) ? v[0] : v)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t.settings.navHideDelay}</Label>
                    <span className="text-muted-foreground text-xs">
                      {navHideDelay / 1000} {t.settings.seconds}
                    </span>
                  </div>
                  <Slider
                    value={[navHideDelay]}
                    min={1000}
                    max={15000}
                    step={1000}
                    onValueChange={(v) => setNavHideDelay(Array.isArray(v) ? v[0] : v)}
                  />
                </div>

                {/* Auto-save debounce time */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{t.settings.syncDebounce}</Label>
                      <p className="text-muted-foreground text-xs">{t.settings.syncDebounceDesc}</p>
                    </div>
                    <span className="text-muted-foreground text-xs">{syncDebounceMs} ms</span>
                  </div>
                  <Slider
                    value={[syncDebounceMs]}
                    min={100}
                    max={3000}
                    step={100}
                    onValueChange={(v) => setSyncDebounceMs(Array.isArray(v) ? v[0] : v)}
                  />
                </div>
              </div>
            </section>

            <Separator className="bg-white/5" />

            {/* Account */}
            <section id="account" className="py-6">
              <h3 className="mb-5 text-xl font-semibold tracking-tight">{t.settings.account}</h3>
              {auth.isLoggedIn() ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                      <User size={18} className="text-cyber-cyan" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{auth.user?.username}</p>
                      <p className="text-muted-foreground truncate text-xs">{auth.user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <Shield size={12} className="text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {t.settings.roleLabel}: {auth.user?.role}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    disabled={isLoggingOut}
                    onClick={confirmLogout}
                  >
                    {isLoggingOut ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <LogOut size={14} className="mr-1.5" />
                    )}
                    {t.settings.logoutButton}
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t.settings.loginEmail}</Label>
                      <div className="relative">
                        <Mail
                          size={14}
                          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                        />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="border-white/10 bg-white/5 pl-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLogin();
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t.settings.loginPassword}</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="border-white/10 bg-white/5 pr-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLogin();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      disabled={isLoggingIn}
                      onClick={handleLogin}
                    >
                      {isLoggingIn && <Loader2 size={14} className="mr-1.5 animate-spin" />}
                      {t.settings.loginButton}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.logoutConfirmTitle}</DialogTitle>
            <DialogDescription>{t.settings.logoutConfirmDesc}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent">
            <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(false)}>
              {t.settings.logoutCancel}
            </Button>
            <Button variant="default" size="sm" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut && <Loader2 size={14} className="mr-1.5 animate-spin" />}
              {t.settings.logoutConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
