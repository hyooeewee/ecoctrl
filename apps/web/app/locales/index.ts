// index.ts — active locale entry point
// To add a locale: create a new file matching the Locale type,
// then export it here and add it to useLocale().

import { useSettingsStore } from "~/store/settings";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

export type { Locale } from "./zh-CN";
export { enUS, zhCN };

// Default locale used for static contexts (meta tags, server-side)
export const locale = zhCN;

// Dynamic locale hook for components — reacts to language setting changes
export function useLocale() {
  const language = useSettingsStore((state) => state.language);
  return language === "en-US" ? enUS : zhCN;
}
