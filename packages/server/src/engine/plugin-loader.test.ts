import { describe, it, expect } from "vitest";
import { validatePluginPackage, extractPluginFromZip, computeContentHash } from "./plugin-loader";

describe("computeContentHash", () => {
  it("computes sha256 of sorted file contents", () => {
    const files = new Map([
      ["b.txt", "content-b"],
      ["a.txt", "content-a"],
    ]);
    const hash = computeContentHash(files);
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);
  });
});

describe("validatePluginPackage", () => {
  it("throws for missing manifest", async () => {
    const files = new Map([["backend.js", "code"]]);
    await expect(validatePluginPackage(files)).rejects.toThrow("manifest.json is required");
  });

  it("throws for invalid manifest id", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "Bad Id!",
          name: "x",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["backend.js", "module.exports = async () => {}"],
      ["schema.json", JSON.stringify({ type: "object", properties: { x: { type: "string" } } })],
    ]);
    await expect(validatePluginPackage(files)).rejects.toThrow("Invalid manifest.json");
  });

  it("throws for missing backend.js", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "test-node",
          name: "Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["schema.json", JSON.stringify({ type: "object", properties: { x: { type: "string" } } })],
    ]);
    await expect(validatePluginPackage(files)).rejects.toThrow("Entry file 'backend.js' not found");
  });

  it("throws for invalid schema type", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "test-node",
          name: "Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["backend.js", "module.exports = async () => {}"],
      ["schema.json", JSON.stringify({ type: "string" })],
    ]);
    await expect(validatePluginPackage(files)).rejects.toThrow("top-level type must be 'object'");
  });

  it("throws for empty schema properties", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "test-node",
          name: "Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["backend.js", "module.exports = async () => {}"],
      ["schema.json", JSON.stringify({ type: "object", properties: {} })],
    ]);
    await expect(validatePluginPackage(files)).rejects.toThrow("properties must not be empty");
  });

  it("throws for missing module.exports", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "test-node",
          name: "Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["backend.js", "const x = 1;"],
      ["schema.json", JSON.stringify({ type: "object", properties: { x: { type: "string" } } })],
    ]);
    await expect(validatePluginPackage(files)).rejects.toThrow(
      "must export a function via module.exports",
    );
  });

  it("returns manifest and code for valid package", async () => {
    const files = new Map([
      [
        "manifest.json",
        JSON.stringify({
          id: "test-node",
          name: "Test",
          version: "1.0.0",
          category: "action",
          entry: "backend.js",
          schema: "schema.json",
        }),
      ],
      ["backend.js", "module.exports = async () => {}"],
      ["schema.json", JSON.stringify({ type: "object", properties: { x: { type: "string" } } })],
    ]);
    const result = await validatePluginPackage(files);
    expect(result.manifest.id).toBe("test-node");
    expect(result.backendCode).toBe("module.exports = async () => {}");
    expect(result.schema.type).toBe("object");
  });
});

describe("extractPluginFromZip", () => {
  it("extracts files from a zip buffer", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile(
      "manifest.json",
      Buffer.from(
        JSON.stringify({ id: "zip-test", name: "Zip Test", version: "1.0.0", category: "action" }),
      ),
    );
    zip.addFile("backend.js", Buffer.from("module.exports = async () => {}"));
    zip.addFile(
      "schema.json",
      Buffer.from(JSON.stringify({ type: "object", properties: { x: { type: "string" } } })),
    );

    const buffer = zip.toBuffer();
    const { files, comment } = await extractPluginFromZip(buffer);

    expect(files.has("manifest.json")).toBe(true);
    expect(files.has("backend.js")).toBe(true);
    expect(files.has("schema.json")).toBe(true);
    expect(comment).toBeNull();
  });

  it("reads zip comment", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip();
    zip.addFile("manifest.json", Buffer.from("{}"));
    zip.addZipComment("test-comment");

    const buffer = zip.toBuffer();
    const { comment } = await extractPluginFromZip(buffer);
    expect(comment).toBe("test-comment");
  });
});
