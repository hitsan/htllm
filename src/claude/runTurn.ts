import { spawn } from "node:child_process";
import * as readline from "node:readline";

export type RunTurnResult = {
  result: string;
  sessionId: string;
  stopReason: string;
};

const ALL_TOOLS = [
  "Bash",
  "Edit",
  "Write",
  "Read",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "NotebookEdit",
];

export function runTurn(
  prompt: string,
  options?: { resumeSessionId?: string; allowedTools?: string[] },
): Promise<RunTurnResult> {
  // プロンプトにはページの内容（元テキスト由来）が入る。その文言でツールを
  // 動かされないよう、許可リスト方式で呼び出し側に明示させる。既定は全封じ
  const allowed = options?.allowedTools ?? [];
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--disallowedTools",
    ALL_TOOLS.filter((t) => !allowed.includes(t)).join(","),
  ];
  if (allowed.length > 0) {
    args.push("--allowedTools", allowed.join(","));
  }
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
