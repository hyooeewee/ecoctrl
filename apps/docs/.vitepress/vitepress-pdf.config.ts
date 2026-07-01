// .vitepress/vitepress-pdf.config.ts
import { defineUserConfig } from "vitepress-export-pdf";

export default defineUserConfig({
  outFile: "public/EcoCtrl(易控)用户手册.pdf",
  urlOrigin: "https://docs.godot.qzz.io",
  pdfOutlines: true,
  pdfOptions: {
    format: "A4",
    margin: { top: "20px", bottom: "20px" },
  },
});
