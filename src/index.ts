import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "./server.js";
import { buildTree, respond } from "./render.js";
import { renderTree, replaceNode, nodeToText, type Node } from "./tree.js";
import { createThread, appendMessage, invalidateRangeForNode, type Thread } from "./thread.js";

const DOC_PATH = "doc.json";
const THREADS_PATH = "threads.json";

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

async function loadThreads(): Promise<Thread[]> {
  try {
    const raw = await readFile(THREADS_PATH, "utf-8");
    return JSON.parse(raw) as Thread[];
  } catch {
    return [];
  }
}

async function saveThreads(threads: Thread[]): Promise<void> {
  await writeFile(THREADS_PATH, JSON.stringify(threads, null, 2), "utf-8");
}

function toJsx(nodes: Node[], threads: Thread[]): string {
  return `
window.__htllmRoot = window.__htllmRoot || ReactDOM.createRoot(document.getElementById('root'));
window.__htllmRoot.render(${renderTree(nodes, threads)});
`;
}

let nodes = await loadTree();
if (nodes.length === 0) {
  const initial = "htllmへようこそ。これはファイルに保存された部品ツリーから表示されています。テキストを選択すると、その部品だけを指示や質問で操作できます。";
  nodes = await buildTree(initial);
  await saveTree(nodes);
}
let threads = await loadThreads();

type PendingResult = { answer: string; jsx: string };
const pendingAnswers = new Map<string, PendingResult | null>();

async function resolveAnswer(thread: Thread, target: Node, message: string): Promise<void> {
  let answer: string;
  let updatedThread = thread;
  try {
    const docText = nodes.map(nodeToText).join("\n");
    const result = await respond(target, docText, thread.quote, message, thread.sessionId);
    if (result.kind === "edit") {
      nodes = replaceNode(nodes, thread.nodeId, result.node);
      threads = invalidateRangeForNode(threads, thread.nodeId);
      updatedThread = threads.find((t) => t.id === thread.id) ?? thread;
      await saveTree(nodes);
      answer = "反映しました";
    } else {
      answer = result.answer;
    }
    updatedThread = { ...updatedThread, sessionId: result.sessionId };
  } catch (err) {
    answer = `エラー: ${err instanceof Error ? err.message : String(err)}`;
  }

  const updated = appendMessage(updatedThread, "assistant", answer);
  threads = threads.map((t) => (t.id === thread.id ? updated : t));
  await saveThreads(threads);
  pendingAnswers.set(thread.id, { answer, jsx: toJsx(nodes, threads) });
}

async function onCreateThread(params: {
  nodeId: string;
  start: number;
  end: number;
  message: string;
}): Promise<{ threadId: string; jsx: string }> {
  const target = nodes.find((n) => n.id === params.nodeId);
  if (!target) {
    throw new Error(`node not found: ${params.nodeId}`);
  }

  const quote = nodeToText(target).slice(params.start, params.end);
  const range = { start: params.start, end: params.end };
  let thread = createThread({ nodeId: params.nodeId, range, quote });
  thread = appendMessage(thread, "user", params.message);
  threads = [...threads, thread];
  await saveThreads(threads);

  pendingAnswers.set(thread.id, null);
  resolveAnswer(thread, target, params.message);

  return { threadId: thread.id, jsx: toJsx(nodes, threads) };
}

async function onGetThread(
  threadId: string,
): Promise<{ pending: boolean; answer: string; jsx: string } | null> {
  if (!pendingAnswers.has(threadId)) {
    return null;
  }
  const result = pendingAnswers.get(threadId)!;
  if (result === null) {
    return { pending: true, answer: "", jsx: toJsx(nodes, threads) };
  }
  return { pending: false, answer: result.answer, jsx: result.jsx };
}

async function onDeleteThread(threadId: string): Promise<{ jsx: string } | null> {
  if (!threads.some((t) => t.id === threadId)) {
    return null;
  }
  threads = threads.filter((t) => t.id !== threadId);
  pendingAnswers.delete(threadId);
  await saveThreads(threads);
  return { jsx: toJsx(nodes, threads) };
}

async function onReply(threadId: string, message: string): Promise<{ jsx: string; answer: string }> {
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) {
    throw new Error(`thread not found: ${threadId}`);
  }
  const target = nodes.find((n) => n.id === thread.nodeId);
  if (!target) {
    throw new Error(`node not found: ${thread.nodeId}`);
  }

  const docText = nodes.map(nodeToText).join("\n");
  const result = await respond(target, docText, thread.quote, message, thread.sessionId);

  let answer: string;
  let updatedThread = thread;
  if (result.kind === "edit") {
    nodes = replaceNode(nodes, thread.nodeId, result.node);
    threads = invalidateRangeForNode(threads, thread.nodeId);
    updatedThread = threads.find((t) => t.id === threadId) ?? thread;
    await saveTree(nodes);
    answer = "反映しました";
  } else {
    answer = result.answer;
  }
  updatedThread = { ...updatedThread, sessionId: result.sessionId };

  let updated = appendMessage(updatedThread, "user", message);
  updated = appendMessage(updated, "assistant", answer);
  threads = threads.map((t) => (t.id === threadId ? updated : t));
  await saveThreads(threads);

  return { jsx: toJsx(nodes, threads), answer };
}

const jsx = toJsx(nodes, threads);

const port = 3000;
const server = createServer(jsx, onCreateThread, onReply, onGetThread, onDeleteThread);
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
