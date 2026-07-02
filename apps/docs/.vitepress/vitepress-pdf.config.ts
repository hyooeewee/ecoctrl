// .vitepress/vitepress-pdf.config.ts
import { defineUserConfig } from "vitepress-export-pdf";
import { guideSidebar, referenceSidebar, deploymentSidebar } from "./config";

// ========================================
// Helpers
// ========================================

/** Flatten a sidebar definition into an ordered list of route paths. */
function flattenSidebar(
  sidebar: { text: string; items: { text: string; link: string }[] }[],
): string[] {
  return sidebar.flatMap((section) => section.items.map((item) => item.link));
}

/** Build an ordered route lookup index from all sidebars combined. */
function buildRoutePriority(
  ...sidebars: { text: string; items: { text: string; link: string }[] }[][]
): Map<string, number> {
  const priority = new Map<string, number>();
  let index = 0;
  for (const sidebar of sidebars) {
    for (const route of flattenSidebar(sidebar)) {
      priority.set(route, index++);
    }
  }
  return priority;
}

const routePriority = buildRoutePriority(guideSidebar, referenceSidebar, deploymentSidebar);
// Place the index/home page first in the PDF — it is not in any sidebar.
routePriority.set("/", -1);

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
  routePatterns: ["!/changelog.html"],
  /** Order pages by their position in the sidebar hierarchy. */
  sorter(pageA, pageB) {
    const a = routePriority.get(pageA.path) ?? Infinity;
    const b = routePriority.get(pageB.path) ?? Infinity;
    return a - b;
  },
  urlOrigin: "https://docs.godot.qzz.io",
});
