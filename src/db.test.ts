import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import * as readline from "node:readline";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "./db.js";

const PORT = 27118;

function startMongod(dbPath: string, port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn("mongod", ["--dbpath", dbPath, "--port", String(port)]);
    const rl = readline.createInterface({ input: child.stdout });

    rl.on("line", (line) => {
      if (line.includes("Waiting for connections")) {
        resolve(child);
      }
    });

    child.on("error", reject);
  });
}

describe("db", () => {
  let mongod: ChildProcess;
  let dbPath: string;
  const uri = `mongodb://127.0.0.1:${PORT}`;

  beforeAll(async () => {
    dbPath = mkdtempSync(join(tmpdir(), "htllm-mongo-"));
    mongod = await startMongod(dbPath, PORT);
  }, 30000);

  afterAll(() => {
    mongod.kill();
    rmSync(dbPath, { recursive: true, force: true });
  });

  it("connects and pings the server", async () => {
    const db = await connect(uri);
    const result = await db.command({ ping: 1 });

    expect(result.ok).toBe(1);
  });

  it("inserts a document into a collection", async () => {
    const db = await connect(uri);
    const result = await db.collection("test").insertOne({ text: "hello" });

    expect(result.acknowledged).toBe(true);
  });

  it("retrieves an inserted document by id", async () => {
    const db = await connect(uri);
    const inserted = await db.collection("test").insertOne({ text: "world" });

    const found = await db.collection("test").findOne({ _id: inserted.insertedId });

    expect(found?.text).toBe("world");
  });
});
