import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  let dir: string | undefined;
  const originalEnv = process.env.HTLLM_MONGODB_URI;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
    if (originalEnv === undefined) {
      delete process.env.HTLLM_MONGODB_URI;
    } else {
      process.env.HTLLM_MONGODB_URI = originalEnv;
    }
  });

  it("reads mongodbUri from .htllm/config.json", () => {
    dir = mkdtempSync(join(tmpdir(), "htllm-config-"));
    writeFileSync(
      join(dir, "config.json"),
      JSON.stringify({ mongodbUri: "mongodb://from-file:27017" }),
    );

    const config = loadConfig(dir);

    expect(config.mongodbUri).toBe("mongodb://from-file:27017");
  });

  it("prefers HTLLM_MONGODB_URI env var over config.json", () => {
    dir = mkdtempSync(join(tmpdir(), "htllm-config-"));
    writeFileSync(
      join(dir, "config.json"),
      JSON.stringify({ mongodbUri: "mongodb://from-file:27017" }),
    );
    process.env.HTLLM_MONGODB_URI = "mongodb://from-env:27017";

    const config = loadConfig(dir);

    expect(config.mongodbUri).toBe("mongodb://from-env:27017");
  });

  it("falls back to the default when neither exists", () => {
    dir = mkdtempSync(join(tmpdir(), "htllm-config-"));

    const config = loadConfig(dir);

    expect(config.mongodbUri).toBe("mongodb://localhost:27017");
  });
});
