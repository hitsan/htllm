import { spawn } from "node:child_process";
import * as readline from "node:readline";

export type RunTurnResult = {
  result: string;
  sessionId: string;
  stopReason: string;
};

export function runTurn(
  prompt: string,
  options?: { resumeSessionId?: string },
): Promise<RunTurnResult> {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    // このタスクはテキスト変換だけでツールを必要としない。誤ってツールを
    // 実行したりツール前提の応答を混ぜたりしないよう明示的に封じる
    "--disallowedTools",
    "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,NotebookEdit",
  ];
  if (options?.resumeSessionId) {
    args.push("--resume", options.resumeSessionId);
  }

  return new Promise((resolve, reject) => {
    const child = spawn("claude", args);
    const rl = readline.createInterface({ input: child.stdout });
    let stderr = "";
    let resolved: RunTurnResult | undefined;

    rl.on("line", (line) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line);
      } catch {
        return;
      }
      if (parsed.type === "result") {
        resolved = {
          result: String(parsed.result ?? ""),
          sessionId: String(parsed.session_id ?? ""),
          stopReason: String(parsed.stop_reason ?? ""),
        };
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("close", (code) => {
      if (resolved) {
        resolve(resolved);
      } else {
        reject(new Error(`claude exited with code ${code}: ${stderr}`));
      }
    });

    child.on("error", reject);
  });
}
