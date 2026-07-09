import { defineExportConfig, loadSnippet } from "vitepress-export";
import { config } from "./config";
import { type DefaultTheme } from "vitepress";

const multiSidebar = config!.themeConfig!.sidebar! as DefaultTheme.SidebarMulti;
const flatRoute: string[] = [];

const flatSidebar = (sidebars: DefaultTheme.SidebarItem[]): void => {
  sidebars.forEach((sidebar: DefaultTheme.SidebarItem) => {
    if (sidebar.items) flatSidebar(sidebar.items);
    if (sidebar.link) flatRoute.push(sidebar.link);
  });
};

for (const path in multiSidebar) {
  flatSidebar(multiSidebar[path] as DefaultTheme.SidebarItem[]);
}
// console.log(`flatRoute: ${JSON.stringify(flatRoute, null, 2)}`);

export default defineExportConfig({
  output: "../public/EcoCtrl User Manual.pdf",
  navigation: {
    patterns: ["/guide/**"],
    sorter: (a, b) => {
      const aIndex = flatRoute.findIndex((i) => i === a.path) ?? Infinity;
      const bIndex = flatRoute.findIndex((i) => i === b.path) ?? Infinity;
      return aIndex - bIndex;
    },
  },
  pdf: {
    outline: true,
    outlineDepth: 2,
  },
  scripts: loadSnippet("heading_numbering.js"),
});
