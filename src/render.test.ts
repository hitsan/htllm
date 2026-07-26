import { describe, it, expect, vi, beforeEach } from "vitest";

const runTurnMock = vi.fn();
vi.mock("./claude/runTurn.js", () => ({
  runTurn: (...args: unknown[]) => runTurnMock(...args),
}));

const { renderDocument } = await import("./render.js");

describe("renderDocument", () => {
  beforeEach(() => {
    runTurnMock.mockReset();
  });

  it("passes the document's text to runTurn in the prompt", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>Hello htllm</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await renderDocument({ text: "Hello htllm" });

    const [prompt] = runTurnMock.mock.calls[0];
    expect(prompt).toContain("Hello htllm");
  });

  it("returns runTurn's result as-is", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>Hello htllm</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const jsx = await renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("root.render(<h1>Hello htllm</h1>);");
  });

  it("strips a ```jsx code fence wrapping the result", async () => {
    runTurnMock.mockResolvedValue({
      result: "```jsx\n<h1>Hello htllm</h1>\n```",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const jsx = await renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("root.render(<h1>Hello htllm</h1>);");
  });

  it("strips a plain ``` code fence wrapping the result", async () => {
    runTurnMock.mockResolvedValue({
      result: "```\n<h1>Hello htllm</h1>\n```",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const jsx = await renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("root.render(<h1>Hello htllm</h1>);");
  });

  it("extracts the code fence even when wrapped in leading/trailing prose", async () => {
    runTurnMock.mockResolvedValue({
      result: "以下がJSXです。\n```jsx\n<h1>Hello htllm</h1>\n```\n以上です。",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const jsx = await renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("root.render(<h1>Hello htllm</h1>);");
  });

  it("strips leading prose even without a code fence", async () => {
    runTurnMock.mockResolvedValue({
      result: "以下がJSX本体です。\n\n<h1>Hello htllm</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const jsx = await renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("root.render(<h1>Hello htllm</h1>);");
  });
});
