import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

import { locale, useLocale } from "~/locales";

import type { Route } from "./+types/analysis";

export function meta(_args: Route.MetaArgs) {
  return [{ title: `${locale.nav.analysis} — ${locale.meta.title}` }];
}

export default function AnalysisPage() {
  const t = useLocale();
  const navigate = useNavigate();

  return (
    <div className="dark text-foreground relative h-screen overflow-hidden bg-[#060d18] font-mono">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-foreground/80 hover:text-foreground absolute top-4 left-4 z-20 flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <main className="flex h-full flex-col items-center justify-center pt-16">
        <h1 className="text-4xl font-bold">{t.nav.analysis}</h1>
        <p className="text-muted-foreground mt-2">Test Page</p>
      </main>
    </div>
  );
}
