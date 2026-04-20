// index.ts — active locale entry point
// To add a locale: create a new file matching the Locale type,
// then export it here and add it to useLocale().

import { useSettingsStore } from "~/store/settings";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

import type { Locale } from "./zh-CN";
export type { Locale } from "./zh-CN";
export { enUS, zhCN };

// Default locale used for static contexts (meta tags, server-side)
export const locale = zhCN;

// Dynamic locale hook for components — reacts to language setting changes
export function useLocale() {
  const language = useSettingsStore((state) => state.language);
  return language === "en-US" ? enUS : zhCN;
}

/**
 * Resolve a dot-path i18n key against a locale object.
 * Example: getNestedLocaleValue(t, "cards.totalEnergy") → "今日总用电"
 */
export function getNestedLocaleValue(t: Locale, key: string): string | undefined {
  const parts = key.split(".");
  let obj: unknown = t;
  for (const part of parts) {
    if (obj && typeof obj === "object" && part in obj) {
      obj = (obj as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof obj === "string" ? obj : undefined;
}
