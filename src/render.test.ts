import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Node } from "./tree.js";

const runTurnMock = vi.fn();
vi.mock("./claude/runTurn.js", () => ({
  runTurn: (...args: unknown[]) => runTurnMock(...args),
}));

const { buildTree, respond } = await import("./render.js");

describe("buildTree", () => {
  beforeEach(() => {
    runTurnMock.mockReset();
  });

  it("LLMが返した部品配列を、コード側で採番したid付きのNode[]にする", async () => {
    runTurnMock.mockResolvedValue({
      result: '[{"type":"heading","text":"タイトル"},{"type":"prose","text":"本文"}]',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const nodes = await buildTree("何かの入力テキスト");

    expect(nodes.map(({ id, ...rest }) => rest)).toEqual([
      { type: "heading", text: "タイトル" },
      { type: "prose", text: "本文" },
    ]);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(2);
  });

  it("別々のbuildTree呼び出しでidが衝突しない", async () => {
    runTurnMock.mockResolvedValue({
      result: '[{"type":"heading","text":"タイトル"},{"type":"prose","text":"本文"}]',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const first = await buildTree("1回目の入力");
    const second = await buildTree("2回目の入力");

    const ids = [...first, ...second].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("```json コードフェンスで包まれていても中身をパースする", async () => {
    runTurnMock.mockResolvedValue({
      result: '```json\n[{"type":"prose","text":"本文"}]\n```',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const nodes = await buildTree("入力");

    expect(nodes.map(({ id, ...rest }) => rest)).toEqual([{ type: "prose", text: "本文" }]);
  });

  it("入力テキストと利用可能な部品名をプロンプトに含める", async () => {
    runTurnMock.mockResolvedValue({
      result: "[]",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await buildTree("特徴的な入力フレーズ");

    const [prompt] = runTurnMock.mock.calls[0];
    expect(prompt).toContain("特徴的な入力フレーズ");
    expect(prompt).toContain("heading");
    expect(prompt).toContain("prose");
    expect(prompt).toContain("steps");
    expect(prompt).toContain("callout");
    expect(prompt).toContain("table");
    expect(prompt).toContain("codeblock");
    expect(prompt).toContain("card");
    expect(prompt).toContain("diagram");
    expect(prompt).toContain("hero");
    expect(prompt).toContain("compare");
    expect(prompt).toContain("flow");
    expect(prompt).toContain("gallery");
    expect(prompt).toContain("timeline");
    expect(prompt).toContain("recommendation");
    expect(prompt).toContain("qa");
    expect(prompt).toContain("mockup");
  });

  it("text以外のフィールドを持つ部品(steps)もそのままNode化する", async () => {
    runTurnMock.mockResolvedValue({
      result: '[{"type":"steps","items":["準備する","実行する"]}]',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const nodes = await buildTree("手順を含む入力テキスト");

    expect(nodes.map(({ id, ...rest }) => rest)).toEqual([
      { type: "steps", items: ["準備する", "実行する"] },
    ]);
  });

  it("作業ディレクトリ等のメタな言及を禁止する指示を含む", async () => {
    runTurnMock.mockResolvedValue({
      result: "[]",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await buildTree("入力");

    const [prompt] = runTurnMock.mock.calls[0];
    expect(prompt).toContain("無関係な内容は");
  });
});

describe("respond", () => {
  const doc: Node[] = [
    { id: "a1", type: "heading", text: "導入" },
    { id: "a2", type: "prose", text: "古い本文" },
    { id: "a3", type: "card", title: "旧見出し", text: "旧本文" },
  ];

  beforeEach(() => {
    runTurnMock.mockReset();
  });

  it("ページ全体の部品をidつきでプロンプトに含める", async () => {
    runTurnMock.mockResolvedValue({
      result: "ANSWER a2\n回答です",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await respond(doc, "質問文");

    const [prompt] = runTurnMock.mock.calls[0];
    expect(prompt).toContain("a1");
    expect(prompt).toContain("a2");
    expect(prompt).toContain("導入");
    expect(prompt).toContain("古い本文");
    expect(prompt).toContain("質問文");
  });

  it("ANSWER応答から対象idと回答を取り出す", async () => {
    runTurnMock.mockResolvedValue({
      result: "ANSWER a2\n回答です",
      sessionId: "session-abc",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "質問文");

    expect(result).toEqual({
      kind: "answer",
      nodeId: "a2",
      answer: "回答です",
      sessionId: "session-abc",
    });
  });

  it("EDIT応答なら推測された部品のフィールドを差し替えて返す", async () => {
    runTurnMock.mockResolvedValue({
      result: 'EDIT a2\n{"text":"新しい本文"}',
      sessionId: "session-abc",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "指示");

    expect(result).toEqual({
      kind: "edit",
      nodeId: "a2",
      node: { id: "a2", type: "prose", text: "新しい本文" },
      sessionId: "session-abc",
    });
  });

  it("EDIT応答の```json コードフェンスで包まれていても中身をパースする", async () => {
    runTurnMock.mockResolvedValue({
      result: 'EDIT a2\n```json\n{"text":"新しい本文"}\n```',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "指示");

    expect(result.kind === "edit" && result.node).toEqual({
      id: "a2",
      type: "prose",
      text: "新しい本文",
    });
  });

  it("複数フィールドを持つ部品(card)でも、返り値のフィールドをまとめて差し替える", async () => {
    runTurnMock.mockResolvedValue({
      result: 'EDIT a3\n{"title":"新見出し","text":"新本文"}',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "見出しと本文を書き換えて");

    expect(result.kind === "edit" && result.node).toEqual({
      id: "a3",
      type: "card",
      title: "新見出し",
      text: "新本文",
    });
  });

  it("存在しないidを返してきたら、落ちずにその旨をanswerとして返す", async () => {
    runTurnMock.mockResolvedValue({
      result: 'EDIT zzz\n{"text":"新しい本文"}',
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "指示");

    expect(result.kind).toBe("answer");
    expect(result.kind === "answer" && result.nodeId).toBeNull();
  });

  it("1行目の前後の空白・改行を取り除いて判定する", async () => {
    runTurnMock.mockResolvedValue({
      result: "\nANSWER a2\n回答です\n",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const result = await respond(doc, "質問文");

    expect(result).toEqual({
      kind: "answer",
      nodeId: "a2",
      answer: "回答です",
      sessionId: "session-1",
    });
  });

  it("作業ディレクトリ等のメタな言及を禁止する指示を含む", async () => {
    runTurnMock.mockResolvedValue({
      result: "ANSWER a2\n回答です",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await respond(doc, "質問文");

    const [prompt] = runTurnMock.mock.calls[0];
    expect(prompt).toContain("無関係な内容は一切書かないでください");
  });
});
