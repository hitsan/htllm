import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "./server.js";
import { buildTree, respond } from "./render.js";
import { renderTree, replaceNode, reconcileIds, type Node } from "./tree.js";
import { createThread, appendMessage, setTarget, type Thread } from "./thread.js";

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

function toJsx(nodes: Node[]): string {
  return `
window.__htllmRoot = window.__htllmRoot || ReactDOM.createRoot(document.getElementById('root'));
window.__htllmRoot.render(${renderTree(nodes)});
`;
}

const inputPath = process.argv[2];
let nodes = await loadTree();
let threads = await loadThreads();

if (inputPath) {
  const text = await readFile(inputPath, "utf-8");
  nodes = reconcileIds(nodes, await buildTree(text));
  threads = threads.filter((t) => nodes.some((n) => n.id === t.nodeId));
  await saveTree(nodes);
  await saveThreads(threads);
} else if (nodes.length === 0) {
  const initial = "htllmへようこそ。これはファイルに保存された部品ツリーから表示されています。テキストを選択すると、その部品だけを指示や質問で操作できます。";
  nodes = await buildTree(initial);
  await saveTree(nodes);
}

type PendingResult = { answer: string; jsx: string };
const pendingAnswers = new Map<string, PendingResult | null>();

async function applyRespond(thread: Thread, message: string): Promise<{ thread: Thread; answer: string }> {
  const result = await respond(nodes, message, thread.sessionId);

  let answer: string;
  if (result.kind === "edit") {
    nodes = replaceNode(nodes, result.nodeId, result.node);
    await saveTree(nodes);
    answer = "反映しました";
  } else {
    answer = result.answer;
  }

  return {
    thread: { ...setTarget(thread, result.nodeId), sessionId: result.sessionId },
    answer,
  };
}

async function resolveAnswer(thread: Thread, message: string): Promise<void> {
  let updatedThread = thread;
  let answer: string;
  try {
    const applied = await applyRespond(thread, message);
    updatedThread = applied.thread;
    answer = applied.answer;
  } catch (err) {
    answer = `エラー: ${err instanceof Error ? err.message : String(err)}`;
  }

  const updated = appendMessage(updatedThread, "assistant", answer);
  threads = threads.map((t) => (t.id === thread.id ? updated : t));
  await saveThreads(threads);
  pendingAnswers.set(thread.id, { answer, jsx: toJsx(nodes) });
}

async function onCreateThread(params: { message: string }): Promise<{ threadId: string; jsx: string }> {
  let thread = createThread();
  thread = appendMessage(thread, "user", params.message);
  threads = [...threads, thread];
  await saveThreads(threads);

  pendingAnswers.set(thread.id, null);
  resolveAnswer(thread, params.message);

  return { threadId: thread.id, jsx: toJsx(nodes) };
}

async function onGetThread(
  threadId: string,
): Promise<{ pending: boolean; answer: string; jsx: string } | null> {
  if (!pendingAnswers.has(threadId)) {
    return null;
  }
  const result = pendingAnswers.get(threadId)!;
  if (result === null) {
    return { pending: true, answer: "", jsx: toJsx(nodes) };
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
  return { jsx: toJsx(nodes) };
}

async function onReply(threadId: string, message: string): Promise<{ jsx: string; answer: string }> {
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) {
    throw new Error(`thread not found: ${threadId}`);
  }

  const applied = await applyRespond(thread, message);

  let updated = appendMessage(applied.thread, "user", message);
  updated = appendMessage(updated, "assistant", applied.answer);
  threads = threads.map((t) => (t.id === threadId ? updated : t));
  await saveThreads(threads);

  return { jsx: toJsx(nodes), answer: applied.answer };
}

const jsx = toJsx(nodes);

const port = 3000;
const server = createServer(jsx, onCreateThread, onReply, onGetThread, onDeleteThread);
server.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
