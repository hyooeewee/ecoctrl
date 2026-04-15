// index.ts — active locale entry point
// To switch locale: change the import below to a different locale file.
// To add a locale: create app/locales/en-US.ts matching the Locale type,
// then re-export it here.

import { zhCN } from "./zh-CN";

export type { Locale } from "./zh-CN";
export { zhCN };

// Default locale used throughout the app
export const locale = zhCN;
