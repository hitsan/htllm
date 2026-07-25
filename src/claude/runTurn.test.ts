import { describe, it, expect } from "vitest";
import { runTurn } from "./runTurn.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("runTurn", () => {
  it(
    "短いプロンプトを渡すと、正しい応答テキストがresultに入って返る",
    async () => {
      const { result } = await runTurn("1+1は？数字だけ答えて");

      expect(result.trim()).toBe("2");
    },
    30000,
  );

  it(
    "返り値にsessionId（UUID形式の文字列）が含まれる",
    async () => {
      const { sessionId } = await runTurn("1+1は？数字だけ答えて");

      expect(sessionId).toMatch(UUID_PATTERN);
    },
    30000,
  );

  it(
    "返り値のstopReasonが'end_turn'である",
    async () => {
      const { stopReason } = await runTurn("1+1は？数字だけ答えて");

      expect(stopReason).toBe("end_turn");
    },
    30000,
  );

  it(
    "resumeSessionIdを指定して2回連続で呼ぶと、2回目も同じsessionIdが返る",
    async () => {
      const first = await runTurn("1+1は？数字だけ答えて");

      const second = await runTurn("では2+2は？数字だけ答えて", {
        resumeSessionId: first.sessionId,
      });

      expect(second.sessionId).toBe(first.sessionId);
    },
    60000,
  );
});
