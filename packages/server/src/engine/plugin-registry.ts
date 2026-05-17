import fs from "fs/promises";
import path from "path";
import type { PluginDefinition, PluginManifest, PluginVersionInfo } from "./plugin-types";
import { extractPluginFromZip, validatePluginPackage, computeContentHash } from "./plugin-loader";

export class PluginRegistry {
  private plugins = new Map<string, Map<string, PluginDefinition>>(); // id -> version -> definition
  private pluginsDir: string;

  constructor(pluginsDir: string) {
    this.pluginsDir = pluginsDir;
  }

  async loadAll(): Promise<void> {
    this.plugins.clear();
    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginId = entry.name;
        const pluginPath = path.join(this.pluginsDir, pluginId);
        const versions = await fs.readdir(pluginPath, { withFileTypes: true });
        for (const v of versions) {
          if (!v.isDirectory()) continue;
          await this.loadPlugin(pluginId, v.name, path.join(pluginPath, v.name));
        }
      }
    } catch {
      // plugins directory may not exist yet
    }
  }

  async reload(): Promise<void> {
    await this.loadAll();
  }

  private async loadPlugin(id: string, version: string, dir: string): Promise<void> {
    const manifestPath = path.join(dir, "manifest.json");
    const backendPath = path.join(dir, "backend.js");
    const schemaPath = path.join(dir, "schema.json");
    const iconPath = path.join(dir, "icon.svg");

    try {
      const manifestRaw = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestRaw) as PluginManifest;
      const backendCode = await fs.readFile(backendPath, "utf-8");
      const schemaRaw = await fs.readFile(schemaPath, "utf-8");
      const schema = JSON.parse(schemaRaw) as Record<string, unknown>;
      let iconSvg: string | undefined;
      try {
        iconSvg = await fs.readFile(iconPath, "utf-8");
      } catch {
        // icon is optional
      }

      const def: PluginDefinition = {
        id,
        version,
        manifest,
        backendCode,
        schema,
        iconSvg,
        pluginDir: dir,
      };

      let versions = this.plugins.get(id);
      if (!versions) {
        versions = new Map();
        this.plugins.set(id, versions);
      }
      versions.set(version, def);
    } catch (err) {
      console.error(`Failed to load plugin ${id}@${version}:`, (err as Error).message);
    }
  }

  get(id: string, version?: string): PluginDefinition | null {
    const versions = this.plugins.get(id);
    if (!versions) return null;
    if (version) {
      return versions.get(version) ?? null;
    }
    // Return latest version (semver sort)
    const sorted = Array.from(versions.keys()).sort(compareSemver);
    return versions.get(sorted[sorted.length - 1]!) ?? null;
  }

  getAll(): PluginDefinition[] {
    const result: PluginDefinition[] = [];
    for (const versions of this.plugins.values()) {
      const sorted = Array.from(versions.keys()).sort(compareSemver);
      const latest = versions.get(sorted[sorted.length - 1]!);
      if (latest) result.push(latest);
    }
    return result;
  }

  getVersions(id: string): Array<{ version: string; manifest: PluginManifest }> {
    const versions = this.plugins.get(id);
    if (!versions) return [];
    return Array.from(versions.values()).map((v) => ({
      version: v.version,
      manifest: v.manifest,
    }));
  }

  async install(zipBuffer: Buffer): Promise<PluginDefinition> {
    const { files, comment } = await extractPluginFromZip(zipBuffer);

    // Validate structure
    const { manifest, backendCode, schema, iconSvg } = await validatePluginPackage(files);

    // Check content hash from zip comment (optional)
    if (comment) {
      const expectedHash = comment.trim();
      const actualHash = computeContentHash(files);
      if (expectedHash !== actualHash) {
        throw new Error(`Package integrity check failed: hash mismatch`);
      }
    }

    const pluginDir = path.join(this.pluginsDir, manifest.id, manifest.version);
    await fs.mkdir(pluginDir, { recursive: true });

    // Write files
    await fs.writeFile(path.join(pluginDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(pluginDir, manifest.entry), backendCode);
    await fs.writeFile(path.join(pluginDir, manifest.schema), JSON.stringify(schema, null, 2));
    if (iconSvg && manifest.icon) {
      await fs.writeFile(path.join(pluginDir, manifest.icon), iconSvg);
    }

    const def: PluginDefinition = {
      id: manifest.id,
      version: manifest.version,
      manifest,
      backendCode,
      schema,
      iconSvg,
      pluginDir,
    };

    let versions = this.plugins.get(manifest.id);
    if (!versions) {
      versions = new Map();
      this.plugins.set(manifest.id, versions);
    }
    versions.set(manifest.version, def);

    return def;
  }

  async uninstall(id: string, version: string): Promise<void> {
    const versions = this.plugins.get(id);
    if (!versions) {
      throw new Error(`Plugin ${id} not found`);
    }
    const def = versions.get(version);
    if (!def) {
      throw new Error(`Version ${version} of plugin ${id} not found`);
    }

    // TODO: Check refCount before uninstalling (will be implemented in route layer)

    versions.delete(version);
    if (versions.size === 0) {
      this.plugins.delete(id);
    }

    // Remove from filesystem
    await fs.rm(def.pluginDir, { recursive: true, force: true });
  }
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}
