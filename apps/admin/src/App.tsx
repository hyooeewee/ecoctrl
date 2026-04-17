/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import Accounts from './pages/Accounts';
import Models from './pages/Models';
import ThreeDConfig from './pages/ThreeDConfig';
import Monitoring from './pages/Monitoring';
import Reports from './pages/Reports';
import Maintenance from './pages/Maintenance';
import Faults from './pages/Faults';
import Energy from './pages/Energy';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'config':
        return <Config />;
      case 'accounts':
        return <Accounts />;
      case 'models':
        return <Models />;
      case 'settingsGroup':
        return <ThreeDConfig />;
      case 'monitoring':
        return <Monitoring />;
      case 'reports':
        return <Reports />;
      case 'maintenance':
        return <Maintenance />;
      case 'faults':
        return <Faults />;
      case 'energy':
        return <Energy />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex bg-background h-screen overflow-hidden text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Header activeTab={activeTab} />
        
        <main className="flex-1 overflow-hidden bg-background">
          <ScrollArea className="h-full w-full">
            <div className="p-8 max-w-[1440px] mx-auto pb-24">
              {renderContent()}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}

