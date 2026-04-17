import React from 'react';
import { Card } from '@/components/ui/card';

export default function Monitoring() {
  return (
    <div className="h-[calc(100vh-140px)] flex items-center justify-center">
      <Card className="w-full max-w-2xl p-20 border-none shadow-sm flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[120px] font-bold text-gray-50 opacity-[0.03] rotate-[-25deg]">MONITORING</span>
        </div>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="animate-pulse flex h-3 w-3 rounded-full bg-blue-600 absolute"></span>
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">流程图实时监控模块</h2>
          <p className="text-gray-500 font-medium">功能模块正在开发中，敬请期待...</p>
          <div className="flex justify-center gap-1.5 pt-4">
             <span className="w-2 h-2 rounded-full bg-gray-200"></span>
             <span className="w-2 h-2 rounded-full bg-primary px-3"></span>
             <span className="w-2 h-2 rounded-full bg-gray-200"></span>
          </div>
        </div>
      </Card>
    </div>
  );
}
