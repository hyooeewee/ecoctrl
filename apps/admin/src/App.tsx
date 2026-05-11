/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScrollArea } from "@ecoctrl/ui";
import React, { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Accounts from "@/pages/Accounts";
import Config from "@/pages/Config";
import Overview from "@/pages/Overview";
import Energy from "@/pages/Energy";
import Faults from "@/pages/Faults";
import Login from "@/pages/Login";
import Maintenance from "@/pages/Maintenance";
import Models from "@/pages/Models";
import Workflows from "@/pages/Workflows";
import Preferences from "@/pages/Preferences";
import Profile from "@/pages/Profile";
import Reports from "@/pages/Reports";
import DashboardModel from "@/pages/DashboardModel";
import { applyDarkMode } from "@/lib/darkMode";
import { authApi } from "./api/auth";
import type { AuthUser } from "./api/auth";
import { preferencesApi } from "./api/preferences";
import type { UserPreferences } from "@ecoctrl/shared";
import { useAppStore } from "./store/appStore";

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "zh-CN",
  density: "comfortable",
  fontSize: "medium",
  desktopNotification: true,
  alertSound: true,
  emailNotification: false,
  sidebarCollapsed: false,
  showBreadcrumb: true,
};

export default function App() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const preferencesOverride = useAppStore((state) => state.preferencesOverride);
  const setPreferenceOverride = useAppStore((state) => state.setPreferenceOverride);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [userDetail, setUserDetail] = useState<AuthUser | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);

  // Compute effective preferences: override > DB > defaults.
  const effectivePrefs = useMemo(
    () => ({ ...DEFAULT_PREFERENCES, ...userPrefs, ...preferencesOverride }),
    [userPrefs, preferencesOverride],
  );

  // Apply theme whenever effective theme changes.
  useEffect(() => {
    if (effectivePrefs.theme) {
      applyDarkMode(effectivePrefs.theme);
    }
  }, [effectivePrefs.theme]);

  const loadUserPrefs = async (userId: string) => {
    try {
      const data = await preferencesApi.get(userId);
      setUserPrefs(data);
    } catch {
      // fallback to defaults
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      authApi
        .me()
        .then((user) => {
          setIsLoggedIn(true);
          setUserDetail(user);
          loadUserPrefs(user.id);
        })
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        })
        .finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  }, []);

  if (!authReady) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(user) => {
          setIsLoggedIn(true);
          setUserDetail(user);
          loadUserPrefs(user.id);
        }}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview />;
      case "config":
        return <Config user={userDetail} />;
      case "accounts":
        return <Accounts />;
      case "models":
        return <Models />;
      case "settingsGroup":
        return <DashboardModel />;
      case "workflows":
        return <Workflows />;
      case "reports":
        return <Reports />;
      case "maintenance":
        return <Maintenance />;
      case "faults":
        return <Faults />;
      case "energy":
        return <Energy />;
      case "profile":
        return <Profile />;
      case "preferences":
        return (
          <Preferences
            userId={userDetail?.id ?? ""}
            initialPrefs={userPrefs ?? undefined}
            onSaved={(prefs) => setUserPrefs(prefs)}
          />
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="bg-background text-foreground selection:bg-primary/10 selection:text-primary flex h-screen overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        defaultCollapsed={effectivePrefs.sidebarCollapsed}
        onCollapsedChange={(collapsed) => setPreferenceOverride({ sidebarCollapsed: collapsed })}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showBreadcrumb={effectivePrefs.showBreadcrumb}
          theme={effectivePrefs.theme}
        />

        <main className="bg-background flex-1 overflow-hidden flex flex-col">
          {activeTab === "config" ||
          activeTab === "preferences" ||
          activeTab === "profile" ||
          activeTab === "workflows" ? (
            <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="mx-auto max-w-[1440px] p-8 pb-12">{renderContent()}</div>
            </ScrollArea>
          )}
        </main>
      </div>
    </div>
  );
}
