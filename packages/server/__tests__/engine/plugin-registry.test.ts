import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PluginRegistry } from "@/engine/plugin-registry";
import { LocalAdapter } from "@/storage/local-adapter";
import type { StorageAdapter } from "@/storage/types";

describe("PluginRegistry", () => {
  let tmpDir: string;
  let storage: StorageAdapter;
  let registry: PluginRegistry;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-test-"));
    storage = new LocalAdapter({ baseDir: tmpDir });
    registry = new PluginRegistry(storage);
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

    // Verify storage
    const manifestKey = "test-action/1.0.0/manifest.json";
    const exists = await storage.exists(manifestKey);
    expect(exists).toBe(true);
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

  it("falls back to the latest version when an exact version is missing", async () => {
    const AdmZip = (await import("adm-zip")).default;

    const zip = new AdmZip();
    zip.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({
          id: "fallback-version",
          name: "Fallback Version",
          version: "2.0.0",
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

    const resolved = registry.resolveForExecution("fallback-version", "1.0.0");
    expect(resolved).not.toBeNull();
    expect(resolved?.version).toBe("2.0.0");
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

    // Verify storage cleanup
    const manifestKey = "to-uninstall/1.0.0/manifest.json";
    const exists = await storage.exists(manifestKey);
    expect(exists).toBe(false);
  });

  it("loads plugins from storage on loadAll", async () => {
    // Manually create plugin files in storage
    const pluginId = "disk-plugin";
    const version = "1.0.0";
    await storage.put(
      `${pluginId}/${version}/manifest.json`,
      Buffer.from(
        JSON.stringify({
          id: pluginId,
          name: "Disk Plugin",
          version,
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ),
    );
    await storage.put(
      `${pluginId}/${version}/backend.js`,
      Buffer.from("module.exports = async () => {}"),
    );
    await storage.put(
      `${pluginId}/${version}/schema.json`,
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );

    const freshRegistry = new PluginRegistry(storage);
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
