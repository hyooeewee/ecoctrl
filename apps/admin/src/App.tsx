/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScrollArea } from "@ui/scroll-area";
import React, { useState } from "react";

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
import Reports from "@/pages/Reports";
import ThreeDConfig from "@/pages/ThreeDConfig";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="bg-background text-foreground selection:bg-primary/10 selection:text-primary flex h-screen overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Header activeTab={activeTab} />

        <main className="bg-background flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="mx-auto max-w-[1440px] p-8 pb-24">{renderContent()}</div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
