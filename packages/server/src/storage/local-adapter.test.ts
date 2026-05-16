import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalAdapter } from "./local-adapter";

describe("LocalAdapter", () => {
  let baseDir: string;
  let adapter: LocalAdapter;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "storage-test-"));
    adapter = new LocalAdapter({ baseDir });
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("should put and check existence", async () => {
    const key = "test/file.txt";
    const data = Buffer.from("hello world");

    await adapter.put(key, data);
    const exists = await adapter.exists(key);
    expect(exists).toBe(true);
  });

  it("should delete a file", async () => {
    const key = "test/delete.txt";
    await adapter.put(key, Buffer.from("data"));
    await adapter.delete(key);
    const exists = await adapter.exists(key);
    expect(exists).toBe(false);
  });

  it("should list files by prefix", async () => {
    await adapter.put("prefix/a.txt", Buffer.from("a"));
    await adapter.put("prefix/b.txt", Buffer.from("b"));
    await adapter.put("other/c.txt", Buffer.from("c"));

    const list = await adapter.list("prefix");
    expect(list.length).toBe(2);
  });

  it("should copy a file", async () => {
    await adapter.put("source.txt", Buffer.from("original"));
    await adapter.copy("source.txt", "dest.txt");
    const exists = await adapter.exists("dest.txt");
    expect(exists).toBe(true);
  });

  it("should return stat for existing file", async () => {
    const key = "stat-test.txt";
    const data = Buffer.from("test content");
    await adapter.put(key, data);

    const stat = await adapter.stat(key);
    expect(stat.size).toBe(data.length);
    expect(stat.contentType).toBe("application/octet-stream");
    expect(stat.lastModified).toBeInstanceOf(Date);
  });
});
