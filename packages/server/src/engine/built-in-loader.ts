import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { PluginRegistry } from "./plugin-registry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILT_IN_DIR = path.join(__dirname, "built-in");

export async function loadBuiltInPlugins(registry: PluginRegistry): Promise<void> {
  const entries = await fs.readdir(BUILT_IN_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  for (const dir of dirs) {
    const pluginDir = path.join(BUILT_IN_DIR, dir.name);
    try {
      const manifestRaw = await fs.readFile(path.join(pluginDir, "manifest.json"), "utf-8");
      const manifest = JSON.parse(manifestRaw);

      const backendCode = await fs.readFile(path.join(pluginDir, manifest.entry), "utf-8");
      const schemaRaw = await fs.readFile(path.join(pluginDir, manifest.schema), "utf-8");

      let iconSvg: string | undefined;
      try {
        iconSvg = await fs.readFile(path.join(pluginDir, manifest.icon || "icon.svg"), "utf-8");
      } catch {
        // icon is optional
      }

      // Build in-memory zip and install via normal install flow
      const AdmZip = (await import("adm-zip")).default;
      const zip = new AdmZip();
      zip.addFile("manifest.json", Buffer.from(manifestRaw));
      zip.addFile(manifest.entry, Buffer.from(backendCode));
      zip.addFile(manifest.schema, Buffer.from(schemaRaw));
      if (iconSvg && manifest.icon) {
        zip.addFile(manifest.icon, Buffer.from(iconSvg));
      }

      await registry.install(zip.toBuffer());
    } catch (err) {
      console.warn(`Failed to load built-in plugin from ${dir.name}:`, (err as Error).message);
    }
  }
}
