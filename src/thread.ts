import { randomUUID } from "node:crypto";

export type ThreadMessage = { role: "user" | "assistant"; text: string };

export type Thread = {
  id: string;
  // 直近のrespond()が推測した対象部品。入力ではなく記録で、返信ごとに決め直される
  nodeId: string | null;
  sessionId?: string;
  messages: ThreadMessage[];
};

export function createThread(): Thread {
  return {
    id: randomUUID(),
    nodeId: null,
    messages: [],
  };
}

export function appendMessage(thread: Thread, role: ThreadMessage["role"], text: string): Thread {
  return { ...thread, messages: [...thread.messages, { role, text }] };
}

export function setTarget(thread: Thread, nodeId: string | null): Thread {
  return { ...thread, nodeId };
}
