export type Node =
  | { id: string; type: "prose"; text: string }
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "steps"; items: string[] }
  | { id: string; type: "callout"; text: string }
  | { id: string; type: "table"; headers: string[]; rows: string[][] }
  | { id: string; type: "codeblock"; code: string }
  | { id: string; type: "card"; title: string; text: string }
  | { id: string; type: "diagram"; nodes: string[] };

function lit(text: string): string {
  return `{${JSON.stringify(text)}}`;
}

export function renderNode(node: Node): string {
  switch (node.type) {
    case "prose":
      return `<p data-node-id="${node.id}">${lit(node.text)}</p>`;
    case "heading":
      return `<h2 data-node-id="${node.id}">${lit(node.text)}</h2>`;
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
  }
}

export function renderTree(nodes: Node[]): string {
  return `<div data-htllm-root>${nodes.map(renderNode).join("")}</div>`;
}

export function replaceNode(nodes: Node[], id: string, newNode: Node): Node[] {
  if (!nodes.some((n) => n.id === id)) {
    throw new Error(`node not found: ${id}`);
  }
  return nodes.map((n) => (n.id === id ? newNode : n));
}
