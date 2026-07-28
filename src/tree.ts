export type Node =
  | { id: string; type: "prose"; text: string }
  | { id: string; type: "heading"; text: string };

export function renderNode(node: Node): string {
  const child = `{${JSON.stringify(node.text)}}`;
  switch (node.type) {
    case "prose":
      return `<p data-node-id="${node.id}">${child}</p>`;
    case "heading":
      return `<h2 data-node-id="${node.id}">${child}</h2>`;
  }
}

export function renderTree(nodes: Node[]): string {
  return `<div data-htllm-root>${nodes.map(renderNode).join("")}</div>`;
}
