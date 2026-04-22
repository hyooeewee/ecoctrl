import { useEffect, useRef, useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from "react-router";

import { Toaster } from "@ecoctrl/ui";

import { TooltipProvider } from "~/components/ui-adapter/tooltip";
import { useLocale } from "~/locales";

import "./app.css";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <TooltipProvider>
          {children}
          <Toaster position="top-center" richColors />
        </TooltipProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

function NotFound404() {
  const t = useLocale();
  const navigate = useNavigate();
  const [count, setCount] = useState(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          void navigate("/");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [navigate]);

  // Progress: 0→full as count goes 15→0
  const progress = ((15 - count) / 15) * 100;

  return (
    <div className="dark text-foreground flex h-screen flex-col items-center justify-center gap-8 bg-[#060d18] font-mono">
      {/* Decorative grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.93 0.2 196 / 0.12) 1px, transparent 1px), linear-gradient(90deg, oklch(0.93 0.2 196 / 0.12) 1px, transparent 1px)",
          backgroundSize: "65px 65px",
        }}
      />

      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-[oklch(0.93_0.2_196/0.04)] blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* 404 */}
        <div className="relative">
          <span className="text-[140px] leading-none font-bold tracking-tight text-[oklch(0.93_0.2_196/0.08)] select-none">
            404
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center text-[140px] leading-none font-bold tracking-tight text-[oklch(0.93_0.2_196)]"
            style={{ WebkitTextStroke: "1px oklch(0.93 0.2 196 / 0.6)", color: "transparent" }}
          >
            404
          </span>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-foreground/80 text-xl font-semibold tracking-widest">
            {t.errors.notFoundTitle}
          </p>
          <p className="text-muted-foreground text-sm tracking-wide">{t.errors.notFoundDesc}</p>
        </div>

        {/* Countdown card */}
        <div className="flex w-72 flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] tracking-wide">
            <span className="text-muted-foreground">{t.errors.autoRedirect}</span>
            <span className="text-[oklch(0.93_0.2_196)] tabular-nums">{count}s</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[oklch(0.93_0.2_196)] transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-1 rounded-lg border border-[oklch(0.93_0.2_196/0.4)] bg-[oklch(0.93_0.2_196/0.08)] px-4 py-2 text-[12px] font-medium tracking-widest text-[oklch(0.93_0.2_196)] transition-colors hover:bg-[oklch(0.93_0.2_196/0.16)]"
          >
            {t.errors.redirectNow}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const t = useLocale();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  if (is404) {
    return <NotFound404 />;
  }

  let details = t.errors.unexpected;
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{t.errors.unexpected}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
