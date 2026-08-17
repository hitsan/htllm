import { describe, it, expect } from "vitest";
import { createThread, appendMessage, setTarget } from "./thread.js";

describe("createThread", () => {
  it("対象未定・messages空で新規スレッドを作る", () => {
    const thread = createThread();

    expect(thread.nodeId).toBeNull();
    expect(thread.messages).toEqual([]);
    expect(typeof thread.id).toBe("string");
    expect(thread.id.length).toBeGreaterThan(0);
  });

  it("呼び出すたびに異なるidを発行する", () => {
    expect(createThread().id).not.toBe(createThread().id);
  });
});

describe("appendMessage", () => {
  it("元のスレッドを変更せず、messagesに追記した新しいスレッドを返す", () => {
    const thread = createThread();

    const updated = appendMessage(thread, "user", "これは何？");

    expect(updated.messages).toEqual([{ role: "user", text: "これは何？" }]);
    expect(thread.messages).toEqual([]);
  });

  it("複数回追記すると履歴が積み重なる", () => {
    const step1 = appendMessage(createThread(), "user", "これは何？");
    const step2 = appendMessage(step1, "assistant", "説明です");

    expect(step2.messages).toEqual([
      { role: "user", text: "これは何？" },
      { role: "assistant", text: "説明です" },
    ]);
  });
});

describe("setTarget", () => {
  it("推測された対象を記録した新しいスレッドを返す", () => {
    const thread = createThread();

    const updated = setTarget(thread, "n1");

    expect(updated.nodeId).toBe("n1");
    expect(thread.nodeId).toBeNull();
  });

  it("返信ごとに対象を決め直せる", () => {
    const updated = setTarget(setTarget(createThread(), "n1"), "n2");

    expect(updated.nodeId).toBe("n2");
  });
});
