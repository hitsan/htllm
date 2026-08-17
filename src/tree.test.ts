import { describe, it, expect } from "vitest";
import { renderNode, renderTree, replaceNode, reconcileIds, nodeToText, type Node } from "./tree.js";

describe("renderNode", () => {
  it("proseノードをdata-node-id付きの段落JSXにする", () => {
    const jsx = renderNode({ id: "n1", type: "prose", text: "こんにちは" });

    expect(jsx).toBe('<p data-node-id="n1">{"こんにちは"}</p>');
  });

  it("headingノードをdata-node-id付きの見出しJSXにする", () => {
    const jsx = renderNode({ id: "h1", type: "heading", text: "タイトル" });

    expect(jsx).toBe('<h2 data-node-id="h1">{"タイトル"}</h2>');
  });

  it("headingノードにbadgeがあれば見出しの前に番号バッジを付ける", () => {
    const jsx = renderNode({ id: "h2", type: "heading", text: "モデル", badge: "01" });

    expect(jsx).toBe(
      '<h2 data-node-id="h2">' +
        '<span className="htllm-heading-badge">{"01"}</span>{"モデル"}' +
        '</h2>',
    );
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

  it("heroノードをeyebrow+大見出し+リード文のJSXにする", () => {
    const jsx = renderNode({
      id: "hr1",
      type: "hero",
      eyebrow: "Design Review",
      title: "本体は部品のツリー",
      lede: "配色は固定し、部品だけをLLMが選ぶ",
    });

    expect(jsx).toBe(
      '<div data-node-id="hr1" className="htllm-hero">' +
        '<p className="htllm-hero-eyebrow">{"Design Review"}</p>' +
        '<h1>{"本体は部品のツリー"}</h1>' +
        '<p className="htllm-hero-lede">{"配色は固定し、部品だけをLLMが選ぶ"}</p>' +
        '</div>',
    );
  });

  it("compareノードを2枚の対比カードのJSXにする", () => {
    const jsx = renderNode({
      id: "cp1",
      type: "compare",
      left: { label: "✗ mdが本体", text: "ただのMarkdownレンダラ", tone: "bad" },
      right: { label: "✓ ツリーが本体", text: "部品を選ぶ余地がある", tone: "good" },
    });

    expect(jsx).toBe(
      '<div data-node-id="cp1" className="htllm-compare">' +
        '<div className="htllm-compare-card" data-tone={"bad"}>' +
        '<div className="htllm-compare-label">{"✗ mdが本体"}</div><p>{"ただのMarkdownレンダラ"}</p>' +
        '</div>' +
        '<div className="htllm-compare-card" data-tone={"good"}>' +
        '<div className="htllm-compare-label">{"✓ ツリーが本体"}</div><p>{"部品を選ぶ余地がある"}</p>' +
        '</div>' +
        '</div>',
    );
  });

  it("flowノードを役割付きの箱と矢印のJSXにする", () => {
    const jsx = renderNode({
      id: "fl1",
      type: "flow",
      nodes: [
        { label: "入力", value: ".md / 素の文", sub: "人が書く", role: "input" },
        { label: "本体", value: "部品ツリー", role: "core" },
      ],
    });

    expect(jsx).toBe(
      '<div data-node-id="fl1" className="htllm-flow">' +
        '<div className="htllm-flow-node" data-role={"input"}>' +
        '<span className="htllm-flow-k">{"入力"}</span><span className="htllm-flow-v">{".md / 素の文"}</span>' +
        '<span className="htllm-flow-s">{"人が書く"}</span>' +
        '</div>' +
        '<span className="htllm-flow-arrow">→</span>' +
        '<div className="htllm-flow-node" data-role={"core"}>' +
        '<span className="htllm-flow-k">{"本体"}</span><span className="htllm-flow-v">{"部品ツリー"}</span>' +
        '</div>' +
        '</div>',
    );
  });

  it("galleryノードをカードグリッドのJSXにする", () => {
    const jsx = renderNode({
      id: "gl1",
      type: "gallery",
      items: [
        { title: "Steps", text: "順序のある手順" },
        { title: "Callout", text: "注記・警告" },
      ],
    });

    expect(jsx).toBe(
      '<div data-node-id="gl1" className="htllm-gallery">' +
        '<div className="htllm-gallery-item"><h4>{"Steps"}</h4><p>{"順序のある手順"}</p></div>' +
        '<div className="htllm-gallery-item"><h4>{"Callout"}</h4><p>{"注記・警告"}</p></div>' +
        '</div>',
    );
  });

  it("timelineノードを番号付きステップのJSXにする(emphasisで強調も付く)", () => {
    const jsx = renderNode({
      id: "tl1",
      type: "timeline",
      steps: [
        { title: "範囲選択", text: "data-node-idを読む" },
        { title: "置換バグが消える", text: "id指定なので原理的に発生しない", emphasis: true },
      ],
    });

    expect(jsx).toBe(
      '<div data-node-id="tl1" className="htllm-timeline">' +
        '<div className="htllm-timeline-step">' +
        '<div className="htllm-timeline-marker">{"1"}</div>' +
        '<div className="htllm-timeline-body"><b>{"範囲選択"}</b><p>{"data-node-idを読む"}</p></div>' +
        '</div>' +
        '<div className="htllm-timeline-step" data-emphasis={"true"}>' +
        '<div className="htllm-timeline-marker">{"2"}</div>' +
        '<div className="htllm-timeline-body"><b>{"置換バグが消える"}</b><p>{"id指定なので原理的に発生しない"}</p></div>' +
        '</div>' +
        '</div>',
    );
  });

  it("recommendationノードを強調ボックス+番号付きリストのJSXにする", () => {
    const jsx = renderNode({
      id: "rc1",
      type: "recommendation",
      title: "まとめ",
      items: ["本体は部品ツリー", "更新はノード単位"],
    });

    expect(jsx).toBe(
      '<div data-node-id="rc1" className="htllm-recommendation">' +
        '<h3>{"まとめ"}</h3>' +
        '<ol><li>{"本体は部品ツリー"}</li><li>{"更新はノード単位"}</li></ol>' +
        '</div>',
    );
  });

  it("qaノードをラベル付き対話リストのJSXにする", () => {
    const jsx = renderNode({
      id: "qa1",
      type: "qa",
      items: [{ label: "Q1", text: "カタログの初期メンバーは何個?" }],
    });

    expect(jsx).toBe(
      '<div data-node-id="qa1" className="htllm-qa">' +
        '<div className="htllm-qa-item">' +
        '<span className="htllm-qa-label">{"Q1"}</span>' +
        '<div className="htllm-qa-text">{"カタログの初期メンバーは何個?"}</div>' +
        '</div>' +
        '</div>',
    );
  });

  it("mockupノードをkind付き行のJSXにする", () => {
    const jsx = renderNode({
      id: "mk1",
      type: "mockup",
      lines: [
        { kind: "quote", text: "選択されたテキストの引用" },
        { kind: "button", text: "続けて聞く" },
      ],
    });

    expect(jsx).toBe(
      '<div data-node-id="mk1" className="htllm-mockup">' +
        '<div className="htllm-mockup-line" data-kind={"quote"}>{"選択されたテキストの引用"}</div>' +
        '<div className="htllm-mockup-line" data-kind={"button"}>{"続けて聞く"}</div>' +
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

  it("heroはeyebrow/title/ledeを改行区切りで返す", () => {
    const text = nodeToText({
      id: "hr1",
      type: "hero",
      eyebrow: "Design Review",
      title: "本体は部品のツリー",
      lede: "配色は固定",
    });

    expect(text).toBe("Design Review\n本体は部品のツリー\n配色は固定");
  });

  it("compareはleft/rightのlabel+textを整形して返す", () => {
    const text = nodeToText({
      id: "cp1",
      type: "compare",
      left: { label: "✗ 悪い例", text: "レンダラ", tone: "bad" },
      right: { label: "✓ 良い例", text: "選ぶ余地", tone: "good" },
    });

    expect(text).toBe("✗ 悪い例: レンダラ\n✓ 良い例: 選ぶ余地");
  });

  it("flowはnodesのlabel/valueを矢印区切りで返す", () => {
    const text = nodeToText({
      id: "fl1",
      type: "flow",
      nodes: [
        { label: "入力", value: ".md", role: "input" },
        { label: "本体", value: "ツリー", role: "core" },
      ],
    });

    expect(text).toBe("入力: .md → 本体: ツリー");
  });

  it("galleryはitemsのtitle/textを改行区切りで返す", () => {
    const text = nodeToText({
      id: "gl1",
      type: "gallery",
      items: [
        { title: "Steps", text: "手順" },
        { title: "Callout", text: "注記" },
      ],
    });

    expect(text).toBe("Steps: 手順\nCallout: 注記");
  });

  it("timelineはstepsのtitle/textを改行区切りで返す", () => {
    const text = nodeToText({
      id: "tl1",
      type: "timeline",
      steps: [{ title: "範囲選択", text: "idを読む" }],
    });

    expect(text).toBe("範囲選択: idを読む");
  });

  it("recommendationはtitle+itemsを改行区切りで返す", () => {
    const text = nodeToText({
      id: "rc1",
      type: "recommendation",
      title: "まとめ",
      items: ["本体は部品ツリー", "更新はノード単位"],
    });

    expect(text).toBe("まとめ\n本体は部品ツリー\n更新はノード単位");
  });

  it("qaはitemsのlabel/textを改行区切りで返す", () => {
    const text = nodeToText({
      id: "qa1",
      type: "qa",
      items: [{ label: "Q1", text: "何個から始める?" }],
    });

    expect(text).toBe("Q1: 何個から始める?");
  });

  it("mockupはlinesのtextを改行区切りで返す", () => {
    const text = nodeToText({
      id: "mk1",
      type: "mockup",
      lines: [
        { kind: "quote", text: "引用" },
        { kind: "button", text: "続けて聞く" },
      ],
    });

    expect(text).toBe("引用\n続けて聞く");
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

describe("reconcileIds", () => {
  it("表示テキストが一致するNodeは旧idを引き継ぐ", () => {
    const oldNodes: Node[] = [
      { id: "old-1", type: "heading", text: "A" },
      { id: "old-2", type: "prose", text: "B" },
    ];
    const newNodes: Node[] = [
      { id: "new-1", type: "heading", text: "A" },
      { id: "new-2", type: "prose", text: "B" },
    ];

    expect(reconcileIds(oldNodes, newNodes).map((n) => n.id)).toEqual(["old-1", "old-2"]);
  });

  it("表示テキストが変わったNodeは新しいidのまま", () => {
    const oldNodes: Node[] = [{ id: "old-1", type: "prose", text: "変更前" }];
    const newNodes: Node[] = [{ id: "new-1", type: "prose", text: "変更後" }];

    expect(reconcileIds(oldNodes, newNodes).map((n) => n.id)).toEqual(["new-1"]);
  });

  it("順番が入れ替わっても内容で対応付ける", () => {
    const oldNodes: Node[] = [
      { id: "old-1", type: "heading", text: "A" },
      { id: "old-2", type: "prose", text: "B" },
    ];
    const newNodes: Node[] = [
      { id: "new-1", type: "prose", text: "B" },
      { id: "new-2", type: "heading", text: "A" },
    ];

    expect(reconcileIds(oldNodes, newNodes).map((n) => n.id)).toEqual(["old-2", "old-1"]);
  });

  it("同じ表示テキストのNodeが複数あっても旧idを重複して割り当てない", () => {
    const oldNodes: Node[] = [
      { id: "old-1", type: "prose", text: "同じ" },
      { id: "old-2", type: "prose", text: "同じ" },
    ];
    const newNodes: Node[] = [
      { id: "new-1", type: "prose", text: "同じ" },
      { id: "new-2", type: "prose", text: "同じ" },
      { id: "new-3", type: "prose", text: "同じ" },
    ];

    const ids = reconcileIds(oldNodes, newNodes).map((n) => n.id);

    expect(ids).toEqual(["old-1", "old-2", "new-3"]);
    expect(new Set(ids).size).toBe(3);
  });
});
