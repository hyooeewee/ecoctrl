import React from "react";

import { Card } from "@/components/ui/card";

export default function Monitoring() {
  return (
    <div className="flex h-[calc(100vh-140px)] items-center justify-center">
      <Card className="relative flex w-full max-w-2xl items-center justify-center overflow-hidden border-none p-20 shadow-sm">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <span className="rotate-[-25deg] text-[120px] font-bold text-gray-50 opacity-[0.03]">
            MONITORING
          </span>
        </div>
        <div className="space-y-4 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span className="absolute flex h-3 w-3 animate-pulse rounded-full bg-blue-600"></span>
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">流程图实时监控模块</h2>
          <p className="font-medium text-gray-500">功能模块正在开发中，敬请期待...</p>
          <div className="flex justify-center gap-1.5 pt-4">
            <span className="h-2 w-2 rounded-full bg-gray-200"></span>
            <span className="bg-primary h-2 w-2 rounded-full px-3"></span>
            <span className="h-2 w-2 rounded-full bg-gray-200"></span>
          </div>
        </div>
      </Card>
    </div>
  );
}
