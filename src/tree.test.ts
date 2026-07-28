import { describe, it, expect } from "vitest";
import { renderNode, renderTree, replaceNode, nodeToText, type Node } from "./tree.js";

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

  it("stepsノードを順序リストのJSXにする", () => {
    const jsx = renderNode({ id: "s1", type: "steps", items: ["準備する", "実行する"] });

    expect(jsx).toBe(
      '<ol data-node-id="s1"><li>{"準備する"}</li><li>{"実行する"}</li></ol>',
    );
  });

  it("calloutノードを強調ボックスのJSXにする", () => {
    const jsx = renderNode({ id: "c1", type: "callout", text: "注意してください" });

    expect(jsx).toBe(
      '<div data-node-id="c1" className="htllm-callout">{"注意してください"}</div>',
    );
  });

  it("tableノードをheadersとrowsを持つtableのJSXにする", () => {
    const jsx = renderNode({
      id: "t1",
      type: "table",
      headers: ["名前", "値"],
      rows: [["A", "1"], ["B", "2"]],
    });

    expect(jsx).toBe(
      '<table data-node-id="t1">' +
        '<thead><tr><th>{"名前"}</th><th>{"値"}</th></tr></thead>' +
        '<tbody>' +
        '<tr><td>{"A"}</td><td>{"1"}</td></tr>' +
        '<tr><td>{"B"}</td><td>{"2"}</td></tr>' +
        '</tbody>' +
        '</table>',
    );
  });

  it("codeblockノードをpre/codeのJSXにする", () => {
    const jsx = renderNode({ id: "cb1", type: "codeblock", code: "const x = 1;" });

    expect(jsx).toBe(
      '<pre data-node-id="cb1"><code>{"const x = 1;"}</code></pre>',
    );
  });

  it("cardノードをtitleとtextを持つJSXにする", () => {
    const jsx = renderNode({ id: "cd1", type: "card", title: "見出し", text: "本文" });

    expect(jsx).toBe(
      '<div data-node-id="cd1" className="htllm-card">' +
        '<h3>{"見出し"}</h3><p>{"本文"}</p>' +
        '</div>',
    );
  });

  it("diagramノードを箱と矢印のJSXにする", () => {
    const jsx = renderNode({ id: "d1", type: "diagram", nodes: ["入力", "変換", "出力"] });

    expect(jsx).toBe(
      '<div data-node-id="d1" className="htllm-diagram">' +
        '<span className="htllm-diagram-box">{"入力"}</span>' +
        '<span className="htllm-diagram-arrow">→</span>' +
        '<span className="htllm-diagram-box">{"変換"}</span>' +
        '<span className="htllm-diagram-arrow">→</span>' +
        '<span className="htllm-diagram-box">{"出力"}</span>' +
        '</div>',
    );
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

describe("nodeToText", () => {
  it("prose/heading/calloutはtextをそのまま返す", () => {
    expect(nodeToText({ id: "n1", type: "prose", text: "本文" })).toBe("本文");
    expect(nodeToText({ id: "n2", type: "heading", text: "見出し" })).toBe("見出し");
    expect(nodeToText({ id: "n3", type: "callout", text: "注意" })).toBe("注意");
  });

  it("stepsはitemsを改行区切りで返す", () => {
    const text = nodeToText({ id: "s1", type: "steps", items: ["準備する", "実行する"] });

    expect(text).toBe("準備する\n実行する");
  });

  it("tableはheadersとrowsをタブ区切り・改行区切りで返す", () => {
    const text = nodeToText({
      id: "t1",
      type: "table",
      headers: ["名前", "値"],
      rows: [["A", "1"]],
    });

    expect(text).toBe("名前\t値\nA\t1");
  });

  it("codeblockはcodeをそのまま返す", () => {
    const text = nodeToText({ id: "cb1", type: "codeblock", code: "const x = 1;" });

    expect(text).toBe("const x = 1;");
  });

  it("cardはtitleとtextを改行区切りで返す", () => {
    const text = nodeToText({ id: "cd1", type: "card", title: "見出し", text: "本文" });

    expect(text).toBe("見出し\n本文");
  });

  it("diagramはnodesを矢印区切りで返す", () => {
    const text = nodeToText({ id: "d1", type: "diagram", nodes: ["入力", "出力"] });

    expect(text).toBe("入力 → 出力");
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
