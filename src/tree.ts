
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
  | { id: string; type: "codeblock"; code: string }
  | { id: string; type: "card"; title: string; text: string }
  | { id: string; type: "diagram"; nodes: string[] }
  | { id: string; type: "hero"; eyebrow: string; title: string; lede: string }
  | { id: string; type: "compare"; left: CompareSide; right: CompareSide }
  | { id: string; type: "flow"; nodes: FlowNode[] }
  | { id: string; type: "gallery"; items: GalleryItem[] }
  | { id: string; type: "timeline"; steps: TimelineStep[] }
  | { id: string; type: "recommendation"; title: string; items: string[] }
  | { id: string; type: "qa"; items: QaItem[] }
  | { id: string; type: "mockup"; lines: MockupLine[] };

function lit(text: string): string {
  return `{${JSON.stringify(text)}}`;
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
    case "codeblock":
      return `<pre data-node-id="${node.id}"><code>${lit(node.code)}</code></pre>`;
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
