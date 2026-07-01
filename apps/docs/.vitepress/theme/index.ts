import DefaultTheme from "vitepress/theme";
import type { EnhanceAppContext } from "vitepress";
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client";

import "./style/cjk-fonts.css";

export default {
  ...DefaultTheme,
  enhanceApp({ app }: EnhanceAppContext) {
    enhanceAppWithTabs(app);
  },
};
