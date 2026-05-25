import { useEffect, useState } from "react";

import { getEffectiveTheme } from "@/lib/darkMode";
import type { Theme } from "@/lib/darkMode";

/**
 * Reactive hook that resolves a Theme preference (including "system")
 * into an effective "light" | "dark" value.
 */
export function useColorMode(theme: Theme): "light" | "dark" {
  const [mode, setMode] = useState(() => getEffectiveTheme(theme));

  useEffect(() => {
    setMode(getEffectiveTheme(theme));

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return mode;
}
