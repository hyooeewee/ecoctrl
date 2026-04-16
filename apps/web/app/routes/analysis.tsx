import { DashboardNav } from "~/components/dashboard/dashboard-nav";
import { locale as t } from "~/locales";

import type { Route } from "./+types/analysis";

export function meta(_args: Route.MetaArgs) {
  return [{ title: `${t.nav.analysis} — ${t.meta.title}` }];
}

export default function AnalysisPage() {
  return (
    <div className="dark text-foreground relative h-screen overflow-hidden bg-[#060d18] font-mono">
      <main className="flex h-full flex-col items-center justify-center">
        <h1 className="text-4xl font-bold">{t.nav.analysis}</h1>
        <p className="text-muted-foreground mt-2">Test Page</p>
      </main>
      <div className="absolute right-0 bottom-0 left-0">
        <DashboardNav />
      </div>
    </div>
  );
}
