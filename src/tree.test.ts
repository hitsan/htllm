import { describe, it, expect } from "vitest";
import { renderNode, renderTree, replaceNode, type Node } from "./tree.js";

describe("renderNode", () => {
  it("proseノードをdata-node-id付きの段落JSXにする", () => {
    const jsx = renderNode({ id: "n1", type: "prose", text: "こんにちは" });

    expect(jsx).toBe('<p data-node-id="n1">{"こんにちは"}</p>');
  });

  it("headingノードをdata-node-id付きの見出しJSXにする", () => {
    const jsx = renderNode({ id: "h1", type: "heading", text: "タイトル" });

    expect(jsx).toBe('<h2 data-node-id="h1">{"タイトル"}</h2>');
  });

  it("JSXを壊す文字を含んでも安全な文字列リテラルとして埋め込む", () => {
    const jsx = renderNode({ id: "n2", type: "prose", text: '</p><script>"{}' });

    expect(jsx).toBe('<p data-node-id="n2">{"</p><script>\\"{}"}</p>');
  });
});

describe("renderTree", () => {
  it("複数ノードを単一のルートdivの中に順番どおり並べる", () => {
    const jsx = renderTree([
      { id: "h1", type: "heading", text: "見出し" },
      { id: "p1", type: "prose", text: "本文" },
    ]);

    expect(jsx).toBe(
      '<div data-htllm-root>' +
        '<h2 data-node-id="h1">{"見出し"}</h2>' +
        '<p data-node-id="p1">{"本文"}</p>' +
        '</div>',
    );
  });
});

describe("replaceNode", () => {
  it("該当idのノードだけを差し替え、他はそのまま保つ", () => {
    const nodes: Node[] = [
      { id: "n1", type: "heading", text: "A" },
      { id: "n2", type: "prose", text: "B" },
    ];

    const result = replaceNode(nodes, "n2", { id: "n2", type: "prose", text: "B2" });

    expect(result).toEqual([
      { id: "n1", type: "heading", text: "A" },
      { id: "n2", type: "prose", text: "B2" },
    ]);
  });

  it("存在しないidを指定するとthrowする", () => {
    expect(() =>
      replaceNode([], "missing", { id: "missing", type: "prose", text: "x" }),
    ).toThrow();
  });
});
