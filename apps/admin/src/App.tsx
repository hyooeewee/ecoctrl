/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScrollArea } from "@ui/scroll-area";
import React, { useEffect, useState } from "react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Accounts from "@/pages/Accounts";
import Config from "@/pages/Config";
import Dashboard from "@/pages/Dashboard";
import Energy from "@/pages/Energy";
import Faults from "@/pages/Faults";
import Maintenance from "@/pages/Maintenance";
import Models from "@/pages/Models";
import Monitoring from "@/pages/Monitoring";
import Profile from "@/pages/Profile";
import Reports from "@/pages/Reports";
import ThreeDConfig from "@/pages/ThreeDConfig";
import { initTheme } from "@/lib/darkMode";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    initTheme();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "config":
        return <Config />;
      case "accounts":
        return <Accounts />;
      case "models":
        return <Models />;
      case "settingsGroup":
        return <ThreeDConfig />;
      case "monitoring":
        return <Monitoring />;
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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="bg-background text-foreground selection:bg-primary/10 selection:text-primary flex h-screen overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="bg-background flex-1 overflow-hidden flex flex-col">
          {activeTab === "config" ? (
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
