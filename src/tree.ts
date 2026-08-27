
type CompareSide = { label: string; text: string; tone: string };
type FlowNode = { label: string; value: string; sub?: string; role: string };
type GalleryItem = { title: string; text: string };
type TimelineStep = { title: string; text: string; emphasis?: boolean };
type QaItem = { label: string; text: string };
type MockupLine = { kind: string; text: string };

export type Node =
  | { id: string; type: "prose"; text: string }
  | { id: string; type: "heading"; text: string; badge?: string }
  | { id: string; type: "steps"; items: string[] }
  | { id: string; type: "callout"; text: string }
  | { id: string; type: "table"; headers: string[]; rows: string[][] }
  | { id: string; type: "codeblock"; code: string; lang?: string; filename?: string }
  | { id: string; type: "diff"; before: string; after: string; lang?: string; filename?: string }
  | { id: string; type: "card"; title: string; text: string }
  | { id: string; type: "diagram"; nodes: string[] }
  | { id: string; type: "hero"; eyebrow: string; title: string; lede: string }
  | { id: string; type: "compare"; left: CompareSide; right: CompareSide }
  | { id: string; type: "flow"; nodes: FlowNode[] }
  | { id: string; type: "gallery"; items: GalleryItem[] }
  | { id: string; type: "timeline"; steps: TimelineStep[] }
  | { id: string; type: "recommendation"; title: string; items: string[] }
  | { id: string; type: "qa"; items: QaItem[] }
  | { id: string; type: "mockup"; lines: MockupLine[] }
  | { id: string; type: "svg"; svg: string; caption: string };

export type DiffRow = {
  left: string | null;
  right: string | null;
  kind: "same" | "add" | "del" | "change";
};

// 行の対応づけはLLMに書かせず、こちらで計算する。コード片が対象なのでO(n*m)で足りる
export function diffLines(before: string, after: string): DiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ left: a[i], right: b[j], kind: "same" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ left: a[i], right: null, kind: "del" });
      i++;
    } else {
      rows.push({ left: null, right: b[j], kind: "add" });
      j++;
    }
  }
  while (i < a.length) rows.push({ left: a[i++], right: null, kind: "del" });
  while (j < b.length) rows.push({ left: null, right: b[j++], kind: "add" });

  return pairChanges(rows);
}

// 隣り合う削除と追加は、左右に並べたほうが書き換えとして読める
function pairChanges(rows: DiffRow[]): DiffRow[] {
  const paired: DiffRow[] = [];
  for (let k = 0; k < rows.length; k++) {
    const del = rows[k];
    const add = rows[k + 1];
    if (del.kind === "del" && add?.kind === "add") {
      paired.push({ left: del.left, right: add.right, kind: "change" });
      k++;
    } else {
      paired.push(del);
    }
  }
  return paired;
}

function lit(text: string): string {
  return `{${JSON.stringify(text)}}`;
}

// コードはハイライトのためにinnerHTMLとしてReactに持たせる。子要素として渡すと
// Reactが管理する実DOMをhljsが直接書き換えることになり、再描画と食い違う
function html(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `dangerouslySetInnerHTML={{__html: ${JSON.stringify(escaped)}}}`;
}

// SVGだけは中身を組み立てずLLMの書いたマークアップをそのまま埋める。JSXとして
// 解釈させるとBabelのトランスパイルが落ちてページ全体が死ぬので、innerHTMLで渡す。
// ponytail: 実行可能な要素だけ落とす最小の除去。ローカル配信前提で完全なサニタイザは入れない
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

export function renderNode(node: Node): string {
  switch (node.type) {
    case "prose":
      return `<p data-node-id="${node.id}">${lit(node.text)}</p>`;
    case "heading": {
      const badge = node.badge !== undefined ? `<span className="htllm-heading-badge">${lit(node.badge)}</span>` : "";
      return `<h2 data-node-id="${node.id}">${badge}${lit(node.text)}</h2>`;
    }
    case "steps": {
      const items = node.items.map((item) => `<li>${lit(item)}</li>`).join("");
      return `<ol data-node-id="${node.id}">${items}</ol>`;
    }
    case "callout":
      return `<div data-node-id="${node.id}" className="htllm-callout">${lit(node.text)}</div>`;
    case "table": {
      const headers = node.headers.map((h) => `<th>${lit(h)}</th>`).join("");
      const rows = node.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${lit(cell)}</td>`).join("")}</tr>`)
        .join("");
      return `<table data-node-id="${node.id}"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    case "codeblock": {
      const name = node.filename !== undefined ? `<div className="htllm-code-name">${lit(node.filename)}</div>` : "";
      const cls = node.lang !== undefined ? ` className="language-${node.lang}"` : "";
      return `<div data-node-id="${node.id}" className="htllm-code">${name}<pre><code${cls} ${html(node.code)} /></pre></div>`;
    }
    case "diff": {
      const name = node.filename !== undefined ? `<div className="htllm-code-name">${lit(node.filename)}</div>` : "";
      let oldNo = 0;
      let newNo = 0;
      const rows = diffLines(node.before, node.after)
        .flatMap((r) =>
          // unifiedでは書き換えを削除行と追加行に分けて縦に並べる
          r.kind === "change"
            ? [
                { kind: "del", text: r.left ?? "" },
                { kind: "add", text: r.right ?? "" },
              ]
            : [{ kind: r.kind, text: r.left ?? r.right ?? "" }],
        )
        .map(({ kind, text }) => {
          const old = kind === "add" ? "" : String(++oldNo);
          const next = kind === "del" ? "" : String(++newNo);
          const marker = kind === "del" ? "-" : kind === "add" ? "+" : " ";
          return (
            `<tr className="htllm-diff-row" data-kind=${lit(kind)}>` +
            `<td className="htllm-diff-num" data-old=${lit(old)} />` +
            `<td className="htllm-diff-num" data-new=${lit(next)} />` +
            `<td className="htllm-diff-cell" data-marker=${lit(marker)} ${html(text)} />` +
            `</tr>`
          );
        })
        .join("");
      const lang = node.lang !== undefined ? ` data-lang=${lit(node.lang)}` : "";
      // 列幅と行の背景を揃えるのはtableが最も素直。GitHubもdiff2htmlも同じ
      return `<div data-node-id="${node.id}" className="htllm-diff"${lang}>${name}<div className="htllm-diff-scroll"><table className="htllm-diff-body"><tbody>${rows}</tbody></table></div></div>`;
    }
    case "card":
      return `<div data-node-id="${node.id}" className="htllm-card"><h3>${lit(node.title)}</h3><p>${lit(node.text)}</p></div>`;
    case "diagram": {
      const boxes = node.nodes.map((n) => `<span className="htllm-diagram-box">${lit(n)}</span>`);
      return `<div data-node-id="${node.id}" className="htllm-diagram">${boxes.join('<span className="htllm-diagram-arrow">→</span>')}</div>`;
    }
    case "hero":
      return `<div data-node-id="${node.id}" className="htllm-hero"><p className="htllm-hero-eyebrow">${lit(node.eyebrow)}</p><h1>${lit(node.title)}</h1><p className="htllm-hero-lede">${lit(node.lede)}</p></div>`;
    case "compare": {
      const side = (s: CompareSide) =>
        `<div className="htllm-compare-card" data-tone=${lit(s.tone)}><div className="htllm-compare-label">${lit(s.label)}</div><p>${lit(s.text)}</p></div>`;
      return `<div data-node-id="${node.id}" className="htllm-compare">${side(node.left)}${side(node.right)}</div>`;
    }
    case "flow": {
      const items = node.nodes.map((n) => {
        const sub = n.sub !== undefined ? `<span className="htllm-flow-s">${lit(n.sub)}</span>` : "";
        return `<div className="htllm-flow-node" data-role=${lit(n.role)}><span className="htllm-flow-k">${lit(n.label)}</span><span className="htllm-flow-v">${lit(n.value)}</span>${sub}</div>`;
      });
      return `<div data-node-id="${node.id}" className="htllm-flow">${items.join('<span className="htllm-flow-arrow">→</span>')}</div>`;
    }
    case "gallery": {
      const items = node.items
        .map((it) => `<div className="htllm-gallery-item"><h4>${lit(it.title)}</h4><p>${lit(it.text)}</p></div>`)
        .join("");
      return `<div data-node-id="${node.id}" className="htllm-gallery">${items}</div>`;
    }
    case "timeline": {
      const steps = node.steps
        .map((s, i) => {
          const emphasis = s.emphasis ? ` data-emphasis=${lit("true")}` : "";
          return `<div className="htllm-timeline-step"${emphasis}><div className="htllm-timeline-marker">${lit(String(i + 1))}</div><div className="htllm-timeline-body"><b>${lit(s.title)}</b><p>${lit(s.text)}</p></div></div>`;
        })
        .join("");
      return `<div data-node-id="${node.id}" className="htllm-timeline">${steps}</div>`;
    }
    case "recommendation": {
      const items = node.items.map((item) => `<li>${lit(item)}</li>`).join("");
      return `<div data-node-id="${node.id}" className="htllm-recommendation"><h3>${lit(node.title)}</h3><ol>${items}</ol></div>`;
    }
    case "qa": {
      const items = node.items
        .map((it) => `<div className="htllm-qa-item"><span className="htllm-qa-label">${lit(it.label)}</span><div className="htllm-qa-text">${lit(it.text)}</div></div>`)
        .join("");
      return `<div data-node-id="${node.id}" className="htllm-qa">${items}</div>`;
    }
    case "mockup": {
      const lines = node.lines
        .map((l) => `<div className="htllm-mockup-line" data-kind=${lit(l.kind)}>${lit(l.text)}</div>`)
        .join("");
      return `<div data-node-id="${node.id}" className="htllm-mockup">${lines}</div>`;
    }
    case "svg": {
      const body = `<div className="htllm-svg-body" dangerouslySetInnerHTML={{__html: ${JSON.stringify(sanitizeSvg(node.svg))}}} />`;
      return `<figure data-node-id="${node.id}" className="htllm-svg">${body}<figcaption>${lit(node.caption)}</figcaption></figure>`;
    }
  }
}

export function nodeToText(node: Node): string {
  switch (node.type) {
    case "prose":
    case "heading":
    case "callout":
      return node.text;
    case "steps":
      return node.items.join("\n");
    case "table":
      return [node.headers.join("\t"), ...node.rows.map((row) => row.join("\t"))].join("\n");
    case "codeblock":
      return node.code;
    case "diff":
      return `${node.filename ?? ""}\n${node.before}\n${node.after}`;
    case "card":
      return `${node.title}\n${node.text}`;
    case "diagram":
      return node.nodes.join(" → ");
    case "hero":
      return `${node.eyebrow}\n${node.title}\n${node.lede}`;
    case "compare":
      return `${node.left.label}: ${node.left.text}\n${node.right.label}: ${node.right.text}`;
    case "flow":
      return node.nodes.map((n) => `${n.label}: ${n.value}`).join(" → ");
    case "gallery":
      return node.items.map((it) => `${it.title}: ${it.text}`).join("\n");
    case "timeline":
      return node.steps.map((s) => `${s.title}: ${s.text}`).join("\n");
    case "recommendation":
      return [node.title, ...node.items].join("\n");
    case "qa":
      return node.items.map((it) => `${it.label}: ${it.text}`).join("\n");
    case "mockup":
      return node.lines.map((l) => l.text).join("\n");
    // SVG本体は再生成のたびに座標が揺れるため、id引き継ぎの鍵にはcaptionだけを使う
    case "svg":
      return node.caption;
  }
}

export function renderTree(nodes: Node[]): string {
  return `<div data-htllm-root>${nodes.map(renderNode).join("")}</div>`;
}

export function reconcileIds(oldNodes: Node[], newNodes: Node[]): Node[] {
  const idsByText = new Map<string, string[]>();
  for (const node of oldNodes) {
    const key = nodeToText(node);
    const ids = idsByText.get(key) ?? [];
    ids.push(node.id);
    idsByText.set(key, ids);
  }

  return newNodes.map((node) => {
    const inherited = idsByText.get(nodeToText(node))?.shift();
    return inherited !== undefined ? { ...node, id: inherited } : node;
  });
}

export type Edit = { id: string; nodes: Node[] };

// 対象idの位置を配列で置き換える。1つなら差し替え、複数なら展開、空なら削除
export function applyEdits(nodes: Node[], edits: Edit[]): Node[] {
  for (const edit of edits) {
    if (!nodes.some((n) => n.id === edit.id)) {
      throw new Error(`node not found: ${edit.id}`);
    }
    nodes = nodes.flatMap((n) => (n.id === edit.id ? edit.nodes : [n]));
  }
  return nodes;
}
