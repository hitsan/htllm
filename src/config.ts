import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type Config = {
  mongodbUri: string;
};

const DEFAULT_MONGODB_URI = "mongodb://localhost:27017";

export function loadConfig(projectDir: string): Config {
  if (process.env.HTLLM_MONGODB_URI) {
    return { mongodbUri: process.env.HTLLM_MONGODB_URI };
  }

  const configPath = join(projectDir, "config.json");
  if (existsSync(configPath)) {
    const parsed = JSON.parse(readFileSync(configPath, "utf-8"));
    if (parsed.mongodbUri) {
      return { mongodbUri: parsed.mongodbUri };
    }
  }

  return { mongodbUri: DEFAULT_MONGODB_URI };
}
