// .vitepress/vitepress-pdf.config.ts
import { defineUserConfig, type PageType } from "vitepress-export-pdf";
import { config } from "./config";
import type { DefaultTheme } from "vitepress";

// ========================================
// Helpers
// ========================================

function extractLinksFromConfig(sidebar: DefaultTheme.SidebarMulti): string[] {
  const links: string[] = [];

  function extractLinks(sidebarItems: DefaultTheme.SidebarItem[]) {
    for (const item of sidebarItems) {
      if (item.items) extractLinks(item.items);
      else if (item.link) links.push(`${item.link}`);
    }
  }

  for (const key in sidebar) extractLinks(sidebar[key] as DefaultTheme.SidebarItem[]);

  return links;
}

const links = extractLinksFromConfig(config.themeConfig?.sidebar as DefaultTheme.SidebarMulti);
const routeOrder = ["/index", ...links];

// ========================================
// Template
// ========================================

const headerTemplate = `<div style="margin-top: -0.4cm; height: 70%; width: 100%; display: flex; justify-content: center; align-items: center; color: lightgray; border-bottom: solid lightgray 1px; font-size: 10px;">
  <span class="title"></span>
</div>`;

const footerTemplate = `<div style="margin-bottom: -0.4cm; height: 70%; width: 100%; display: flex; justify-content: flex-start; align-items: center; color: lightgray; border-top: solid lightgray 1px; font-size: 10px;">
  <span style="margin-left: 15px;" class="url"></span>
</div>`;

// ========================================
// Config
// ========================================

export default defineUserConfig({
  outFile: "EcoCtrl User Manual.pdf",
  outDir: "public",
  pdfOutlines: true,
  pdfOptions: {
    format: "A4",
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: {
      bottom: 60,
      left: 25,
      right: 25,
      top: 60,
    },
  },
  /** Order pages by their position in the sidebar hierarchy. */
  sorter(pageA: PageType, pageB: PageType) {
    const indexA = routeOrder.findIndex((p) => p === pageA.path);
    const indexB = routeOrder.findIndex((p) => p === pageB.path);
    return indexA - indexB;
  },
  urlOrigin: "https://docs.godot.qzz.io",
});
