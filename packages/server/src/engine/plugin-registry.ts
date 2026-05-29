import type { StorageAdapter } from "@/storage/types";
import { getLogger } from "@/lib/logger";
import type { PluginDefinition, PluginManifest } from "./plugin-types";
import { extractPluginFromZip, validatePluginPackage, computeContentHash } from "./plugin-loader";
import AsyncLock from "async-lock";

const logger = getLogger("plugin-registry");

const PLUGIN_PREFIX = "";

async function streamToString(stream: ReadableStream | NodeJS.ReadableStream): Promise<string> {
  // Handle Web Streams API ReadableStream
  if ("getReader" in stream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  // Handle Node.js ReadableStream
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    stream.on("error", reject);
  });
}

function buildKey(id: string, version: string, filename: string): string {
  return `${PLUGIN_PREFIX}${id}/${version}/${filename}`;
}

export class PluginRegistry {
  private plugins = new Map<string, Map<string, PluginDefinition>>(); // id -> version -> definition
  private storage: StorageAdapter;
  private lock = new AsyncLock();

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async loadAll(): Promise<void> {
    this.plugins.clear();
    try {
      const keys = await this.storage.list(PLUGIN_PREFIX);
      // Group keys by plugin id and version
      const groups = new Map<string, Map<string, string[]>>(); // id -> version -> filenames
      for (const key of keys) {
        const relative = key.slice(PLUGIN_PREFIX.length); // "id/version/filename"
        const parts = relative.split("/");
        if (parts.length < 3) continue;
        const id = parts[0];
        const version = parts[1];
        const filename = parts.slice(2).join("/");
        let versions = groups.get(id);
        if (!versions) {
          versions = new Map();
          groups.set(id, versions);
        }
        let files = versions.get(version);
        if (!files) {
          files = [];
          versions.set(version, files);
        }
        files.push(filename);
      }

      for (const [id, versions] of groups) {
        for (const [version, files] of versions) {
          await this.loadPlugin(id, version, files);
        }
      }
    } catch {
      // Storage may be empty or unavailable
    }
  }

  async reload(): Promise<void> {
    await this.loadAll();
  }

  private async loadPlugin(id: string, version: string, files: string[]): Promise<void> {
    try {
      const manifestRaw = await this.readFile(id, version, "manifest.json");
      if (!manifestRaw) return;
      const manifest = JSON.parse(manifestRaw) as PluginManifest;

      const entryFile = manifest.entry || "backend.js";
      const backendCode = await this.readFile(id, version, entryFile);
      if (!backendCode) return;

      const schemaFile = manifest.schema || "schema.json";
      const schemaRaw = await this.readFile(id, version, schemaFile);
      if (!schemaRaw) return;
      const schema = JSON.parse(schemaRaw) as Record<string, unknown>;

      let iconSvg: string | undefined;
      if (manifest.icon && files.includes(manifest.icon)) {
        iconSvg = await this.readFile(id, version, manifest.icon);
      }

      const def: PluginDefinition = {
        id,
        version,
        manifest,
        backendCode,
        schema,
        iconSvg,
      };

      let versionMap = this.plugins.get(id);
      if (!versionMap) {
        versionMap = new Map();
        this.plugins.set(id, versionMap);
      }
      versionMap.set(version, def);
    } catch (err) {
      logger.error(`Failed to load plugin ${id}@${version}: ${(err as Error).message}`);
    }
  }

  private async readFile(
    id: string,
    version: string,
    filename: string,
  ): Promise<string | undefined> {
    try {
      const stream = await this.storage.get(buildKey(id, version, filename));
      return await streamToString(stream);
    } catch {
      return undefined;
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
    return this.lock.acquire("registry", async () => {
      const { files, comment } = await extractPluginFromZip(zipBuffer);
      const { manifest, backendCode, schema, iconSvg } = await validatePluginPackage(files);

      // Idempotency: return existing if already installed
      const existing = this.plugins.get(manifest.id)?.get(manifest.version);
      if (existing) {
        return existing;
      }

      // Check content hash from zip comment (optional)
      if (comment) {
        const expectedHash = comment.trim();
        const actualHash = computeContentHash(files);
        if (expectedHash !== actualHash) {
          throw new Error(`Package integrity check failed: hash mismatch`);
        }
      }

      // Upload files to storage
      await this.storage.put(
        buildKey(manifest.id, manifest.version, "manifest.json"),
        Buffer.from(JSON.stringify(manifest, null, 2)),
      );
      await this.storage.put(
        buildKey(manifest.id, manifest.version, manifest.entry),
        Buffer.from(backendCode),
      );
      await this.storage.put(
        buildKey(manifest.id, manifest.version, manifest.schema),
        Buffer.from(JSON.stringify(schema, null, 2)),
      );
      if (iconSvg && manifest.icon) {
        await this.storage.put(
          buildKey(manifest.id, manifest.version, manifest.icon),
          Buffer.from(iconSvg),
        );
      }

      const def: PluginDefinition = {
        id: manifest.id,
        version: manifest.version,
        manifest,
        backendCode,
        schema,
        iconSvg,
      };

      let versions = this.plugins.get(manifest.id);
      if (!versions) {
        versions = new Map();
        this.plugins.set(manifest.id, versions);
      }
      versions.set(manifest.version, def);

      return def;
    });
  }

  async exportPlugin(id: string, version: string): Promise<Buffer> {
    const def = this.get(id, version);
    if (!def) {
      throw new Error(`Plugin ${id}@${version} not found`);
    }

    // List all files for this plugin version in storage
    const prefix = buildKey(id, version, "");
    const keys = await this.storage.list(prefix);

    const files = new Map<string, string>();
    for (const key of keys) {
      const relative = key.slice(prefix.length);
      if (!relative) continue;
      const content = await this.readFile(id, version, relative);
      if (content !== undefined) {
        files.set(relative, content);
      }
    }

    if (files.size === 0) {
      throw new Error(`No files found for plugin ${id}@${version}`);
    }

    // Build zip (adm-zip is synchronous; for large files consider worker_threads)
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    for (const [name, content] of files) {
      zip.addFile(name, Buffer.from(content));
    }

    // Add content hash as zip comment
    const hash = computeContentHash(files);
    zip.addZipComment(hash);

    return zip.toBuffer();
  }

  async uninstall(id: string, version: string): Promise<void> {
    return this.lock.acquire("registry", async () => {
      const versions = this.plugins.get(id);
      if (!versions) {
        throw new Error(`Plugin ${id} not found`);
      }
      const def = versions.get(version);
      if (!def) {
        throw new Error(`Version ${version} of plugin ${id} not found`);
      }

      versions.delete(version);
      if (versions.size === 0) {
        this.plugins.delete(id);
      }

      // Remove from storage
      const filesToDelete = [
        buildKey(id, version, "manifest.json"),
        buildKey(id, version, def.manifest.entry),
        buildKey(id, version, def.manifest.schema),
      ];
      if (def.manifest.icon) {
        filesToDelete.push(buildKey(id, version, def.manifest.icon));
      }
      for (const key of filesToDelete) {
        try {
          await this.storage.delete(key);
        } catch {
          // Ignore deletion errors
        }
      }
    });
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
