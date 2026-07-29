import { describe, it, expect } from "vitest";
import { renderTextWithHighlights, createThread, appendMessage, invalidateRangeForNode, type Thread } from "./thread.js";

describe("renderTextWithHighlights", () => {
  it("rangeが空ならテキスト全体をそのまま返す", () => {
    const jsx = renderTextWithHighlights("こんにちは世界", []);

    expect(jsx).toBe('{"こんにちは世界"}');
  });

  it("1つのrangeがあればその範囲だけmarkで囲む", () => {
    const jsx = renderTextWithHighlights("こんにちは世界", [{ id: "t1", start: 5, end: 7 }]);

    expect(jsx).toBe('{"こんにちは"}<mark data-thread-id="t1">{"世界"}</mark>');
  });

  it("rangeが先頭にある場合も正しく分割する", () => {
    const jsx = renderTextWithHighlights("こんにちは世界", [{ id: "t1", start: 0, end: 5 }]);

    expect(jsx).toBe('<mark data-thread-id="t1">{"こんにちは"}</mark>{"世界"}');
  });

  it("複数のrangeがあれば両方囲む", () => {
    const jsx = renderTextWithHighlights("ABCDEFG", [
      { id: "t1", start: 0, end: 1 },
      { id: "t2", start: 3, end: 4 },
    ]);

    expect(jsx).toBe(
      '<mark data-thread-id="t1">{"A"}</mark>{"BC"}<mark data-thread-id="t2">{"D"}</mark>{"EFG"}',
    );
  });

  it("JSXを壊す文字を含んでも安全な文字列リテラルとして埋め込む", () => {
    const jsx = renderTextWithHighlights('</p><script>"{}', [{ id: "t1", start: 0, end: 4 }]);

    expect(jsx).toBe('<mark data-thread-id="t1">{"</p>"}</mark>{"<script>\\"{}"}');
  });
});

describe("createThread", () => {
  it("nodeId/range/mode/quoteを保持し、messagesは空で新規スレッドを作る", () => {
    const thread = createThread({
      nodeId: "n1",
      range: { start: 0, end: 3 },
      mode: "question",
      quote: "ABC",
    });

    expect(thread.nodeId).toBe("n1");
    expect(thread.range).toEqual({ start: 0, end: 3 });
    expect(thread.mode).toBe("question");
    expect(thread.quote).toBe("ABC");
    expect(thread.messages).toEqual([]);
    expect(typeof thread.id).toBe("string");
    expect(thread.id.length).toBeGreaterThan(0);
  });

  it("rangeにnullを渡すとrange:nullのスレッドを作る(instructの全体紐付け用)", () => {
    const thread = createThread({ nodeId: "n1", range: null, mode: "instruct", quote: "ABC" });

    expect(thread.range).toBeNull();
  });

  it("呼び出すたびに異なるidを発行する", () => {
    const t1 = createThread({ nodeId: "n1", range: { start: 0, end: 1 }, mode: "question", quote: "A" });
    const t2 = createThread({ nodeId: "n1", range: { start: 0, end: 1 }, mode: "question", quote: "A" });

    expect(t1.id).not.toBe(t2.id);
  });
});

describe("appendMessage", () => {
  it("元のスレッドを変更せず、messagesに追記した新しいスレッドを返す", () => {
    const thread = createThread({ nodeId: "n1", range: { start: 0, end: 1 }, mode: "question", quote: "A" });

    const updated = appendMessage(thread, "user", "これは何？");

    expect(updated.messages).toEqual([{ role: "user", text: "これは何？" }]);
    expect(thread.messages).toEqual([]);
  });

  it("複数回追記すると履歴が積み重なる", () => {
    const thread = createThread({ nodeId: "n1", range: { start: 0, end: 1 }, mode: "question", quote: "A" });

    const step1 = appendMessage(thread, "user", "これは何？");
    const step2 = appendMessage(step1, "assistant", "説明です");

    expect(step2.messages).toEqual([
      { role: "user", text: "これは何？" },
      { role: "assistant", text: "説明です" },
    ]);
  });
});

describe("invalidateRangeForNode", () => {
  it("指定ノードに紐づくスレッドのrangeをnullにする", () => {
    const threads: Thread[] = [
      createThread({ nodeId: "n1", range: { start: 0, end: 1 }, mode: "instruct", quote: "A" }),
      createThread({ nodeId: "n2", range: { start: 2, end: 3 }, mode: "question", quote: "B" }),
    ];

    const result = invalidateRangeForNode(threads, "n1");

    expect(result[0].range).toBeNull();
    expect(result[1].range).toEqual({ start: 2, end: 3 });
  });
});
