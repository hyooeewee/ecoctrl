import DefaultTheme from "vitepress/theme";
import type { EnhanceAppContext } from "vitepress";
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client";

import "./style/index.css";

export default {
  ...DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    enhanceAppWithTabs(app);
  },
};
