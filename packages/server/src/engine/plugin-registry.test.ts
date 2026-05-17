import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PluginRegistry } from "./plugin-registry";

describe("PluginRegistry", () => {
  let tmpDir: string;
  let registry: PluginRegistry;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-test-"));
    registry = new PluginRegistry(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns null for unknown plugin", () => {
    expect(registry.get("unknown", "1.0.0")).toBeNull();
  });

  it("tracks installed versions", () => {
    expect(registry.getVersions("timer-trigger")).toEqual([]);
  });

  it("installs a plugin from zip buffer", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "test-action",
          name: "Test Action",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    zip.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );

    const plugin = await registry.install(zip.toBuffer());
    expect(plugin.id).toBe("test-action");
    expect(plugin.version).toBe("1.0.0");
    expect(plugin.manifest.name).toBe("Test Action");

    // Verify filesystem
    const manifestPath = path.join(tmpDir, "test-action", "1.0.0", "manifest.json");
    const manifestRaw = await fs.readFile(manifestPath, "utf-8");
    expect(JSON.parse(manifestRaw).id).toBe("test-action");
  });

  it("gets the latest version when no version specified", async () => {
    const AdmZip = (await import("adm-zip")).default;

    // Install v1.0.0
    const zip1 = new AdmZip();
    zip1.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "multi-version",
          name: "Multi Version",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    zip1.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip1.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );
    await registry.install(zip1.toBuffer());

    // Install v2.0.0
    const zip2 = new AdmZip();
    zip2.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "multi-version",
          name: "Multi Version",
          version: "2.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    zip2.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip2.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );
    await registry.install(zip2.toBuffer());

    const latest = registry.get("multi-version");
    expect(latest?.version).toBe("2.0.0");

    const specific = registry.get("multi-version", "1.0.0");
    expect(specific?.version).toBe("1.0.0");
  });

  it("uninstalls a plugin version", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "to-uninstall",
          name: "To Uninstall",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    zip.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );
    await registry.install(zip.toBuffer());

    expect(registry.get("to-uninstall")).not.toBeNull();

    await registry.uninstall("to-uninstall", "1.0.0");
    expect(registry.get("to-uninstall")).toBeNull();

    // Verify filesystem cleanup
    const pluginDir = path.join(tmpDir, "to-uninstall", "1.0.0");
    await expect(fs.access(pluginDir)).rejects.toThrow();
  });

  it("loads plugins from disk on loadAll", async () => {
    // Manually create plugin directory structure
    const pluginDir = path.join(tmpDir, "disk-plugin", "1.0.0");
    await fs.mkdir(pluginDir, { recursive: true });
    await fs.writeFile(
      path.join(pluginDir, "manifest.json"),
      JSON.stringify({
        id: "disk-plugin",
        name: "Disk Plugin",
        version: "1.0.0",
        category: "action",
        entry: "backend.js",
        schema: "schema.json",
      }),
    );
    await fs.writeFile(path.join(pluginDir, "backend.js"), "module.exports = async () => {}");
    await fs.writeFile(
      path.join(pluginDir, "schema.json"),
      JSON.stringify({ type: "object", properties: { x: { type: "string" } } }),
    );

    const freshRegistry = new PluginRegistry(tmpDir);
    await freshRegistry.loadAll();

    const plugin = freshRegistry.get("disk-plugin");
    expect(plugin).not.toBeNull();
    expect(plugin?.manifest.name).toBe("Disk Plugin");
  });

  it("rejects install with hash mismatch", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "hash-test",
          name: "Hash Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    zip.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );
    zip.addZipComment("wrong-hash-value");

    await expect(registry.install(zip.toBuffer())).rejects.toThrow(
      "Package integrity check failed",
    );
  });
});
