import { randomUUID } from "node:crypto";

export type ThreadRange = { id: string; start: number; end: number };

export type ThreadMessage = { role: "user" | "assistant"; text: string };

export type Thread = {
  id: string;
  nodeId: string;
  range: { start: number; end: number } | null;
  quote: string;
  sessionId?: string;
  messages: ThreadMessage[];
};

export function createThread(params: {
  nodeId: string;
  range: { start: number; end: number } | null;
  quote: string;
}): Thread {
  return {
    id: randomUUID(),
    nodeId: params.nodeId,
    range: params.range,
    quote: params.quote,
    messages: [],
  };
}

export function appendMessage(thread: Thread, role: ThreadMessage["role"], text: string): Thread {
  return { ...thread, messages: [...thread.messages, { role, text }] };
}

export function invalidateRangeForNode(threads: Thread[], nodeId: string): Thread[] {
  return threads.map((t) => (t.nodeId === nodeId ? { ...t, range: null } : t));
}

function lit(text: string): string {
  return `{${JSON.stringify(text)}}`;
}

export function renderTextWithHighlights(text: string, ranges: ThreadRange[]): string {
  if (ranges.length === 0) {
    return lit(text);
  }

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let cursor = 0;

  for (const range of sorted) {
    if (range.start > cursor) {
      parts.push(lit(text.slice(cursor, range.start)));
    }
    parts.push(`<mark data-thread-id="${range.id}">${lit(text.slice(range.start, range.end))}</mark>`);
    cursor = range.end;
  }

  if (cursor < text.length) {
    parts.push(lit(text.slice(cursor)));
  }

  return parts.join("");
}
