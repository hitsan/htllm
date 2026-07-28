import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "./server.js";
import { buildTree, updateNode, answerQuestion } from "./render.js";
import { renderTree, replaceNode, nodeToText, type Node } from "./tree.js";

const DOC_PATH = "doc.json";

async function loadTree(): Promise<Node[]> {
  try {
    const raw = await readFile(DOC_PATH, "utf-8");
    return JSON.parse(raw) as Node[];
  } catch {
    return [];
  }
}

async function saveTree(nodes: Node[]): Promise<void> {
  await writeFile(DOC_PATH, JSON.stringify(nodes, null, 2), "utf-8");
}

function toJsx(nodes: Node[]): string {
  return `
window.__htllmRoot = window.__htllmRoot || ReactDOM.createRoot(document.getElementById('root'));
window.__htllmRoot.render(${renderTree(nodes)});
`;
}

let nodes = await loadTree();
if (nodes.length === 0) {
  const initial = "htllmへようこそ。これはファイルに保存された部品ツリーから表示されています。テキストを選択すると、その部品だけを指示で更新できます。";
  nodes = await buildTree(initial);
  await saveTree(nodes);
}

async function onTurn(nodeId: string, instruction: string): Promise<{ jsx: string }> {
  const target = nodes.find((n) => n.id === nodeId);
  if (!target) {
    throw new Error(`node not found: ${nodeId}`);
  }
  const newNode = await updateNode(target, instruction);
  nodes = replaceNode(nodes, nodeId, newNode);
  await saveTree(nodes);
  return { jsx: toJsx(nodes) };
}

async function onAsk(selectedText: string, question: string): Promise<{ answer: string }> {
  const fullText = nodes.map(nodeToText).join("\n");
  const answer = await answerQuestion(fullText, selectedText, question);
  return { answer };
}

const jsx = toJsx(nodes);

const port = 3000;
const server = createServer(jsx, onTurn, onAsk);
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
