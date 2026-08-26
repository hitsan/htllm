import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "./server.js";
import type { Server } from "node:http";
import type {
  CreateThreadHandler,
  ReplyThreadHandler,
  GetThreadHandler,
  DeleteThreadHandler,
  ListThreadsHandler,
  UndoHandler,
} from "./server.js";

describe("createServer", () => {
  let server: Server;
  let baseUrl: string;

  const jsx = "<h1>Hello htllm</h1>";
  const onCreateThread = vi.fn<CreateThreadHandler>();
  const onReply = vi.fn<ReplyThreadHandler>();
  const onGetThread = vi.fn<GetThreadHandler>();
  const onDeleteThread = vi.fn<DeleteThreadHandler>();
  const onListThreads = vi.fn<ListThreadsHandler>();

  beforeAll(async () => {
    server = createServer(jsx, onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("returns status 200 for a GET request", async () => {
    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
  });

  it("returns Content-Type text/html with utf-8 charset", async () => {
    const res = await fetch(baseUrl);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  it("includes the given JSX content in the response body", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain(jsx);
  });

  // クライアントJSはテンプレートリテラルの中にあるので、正規表現の \\* のような
  // エスケープを1段間違えると配信時に壊れ、パネル全体が動かなくなる
  it("配信するクライアントJSが構文エラーなくパースできる", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    const scripts = [...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

    expect(scripts.length).toBeGreaterThan(0);
    for (const code of scripts) {
      expect(() => new Function(code)).not.toThrow();
    }
  });

  it("チャット欄の幅をCSS変数で制御し、ドラッグ用の仕切りを持つ", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("--panel-w");
    expect(body).toContain('id="htllm-panel-resizer"');
    expect(body).toContain("col-resize");
    // 本文側の余白もパネル幅に追従しないと、広げたときに本文が隠れる
    expect(body).toContain("padding-right: var(--panel-w)");
    expect(body).toContain("width: var(--panel-w)");
  });

  // テーマCSSは読まない。data-theme切替に追従させるため色は自前のCSS変数で当てる
  it("highlight.jsのJSだけを読み、ハイライトの色は自前で定義する", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("highlight.min.js");
    expect(body).not.toContain("highlight.js/styles");
    expect(body).toContain(".hljs-keyword");
    expect(body).toContain("highlightElement");
  });

  it("includes the React CDN script tag", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("https://unpkg.com/react@18/umd/react.production.min.js");
  });

  it("includes the ReactDOM CDN script tag", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("https://unpkg.com/react-dom@18/umd/react-dom.production.min.js");
  });

  it("includes the Babel standalone CDN script tag", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("https://unpkg.com/@babel/standalone/babel.min.js");
  });

  it("embeds the JSX source in a text/babel script tag", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain(`<script type="text/babel" id="htllm-jsx-script">${jsx}</script>`);
  });

  it("centers body content with a flex layout spanning the full viewport height", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("display: flex");
    expect(body).toContain("justify-content: center");
    expect(body).toContain("min-height: 100vh");
  });

  it("sets a body background that adapts to light/dark theme", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("prefers-color-scheme: dark");
  });

  it("places the composer after the thread list in the DOM, so it sits at the bottom of the column-flex panel", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body.indexOf('id="htllm-threads"')).toBeLessThan(body.indexOf('id="htllm-composer"'));
  });

  it("makes the thread list the scrollable, flexible region of the panel", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain("#htllm-threads {");
    expect(body).toMatch(/#htllm-threads\s*\{[^}]*flex:\s*1/);
    expect(body).toMatch(/#htllm-threads\s*\{[^}]*overflow-y:\s*auto/);
  });

  it("gives the thread list min-height: 0 so a long conversation scrolls inside it instead of growing the flex item past the panel", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/#htllm-threads\s*\{[^}]*min-height:\s*0/);
  });

  it("clips panel overflow so a long conversation can never push the fixed panel past the viewport", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/#htllm-comments-panel\s*\{[^}]*overflow:\s*hidden/);
  });

  it("anchors a short conversation to the bottom via auto margin, not justify-content (which breaks scrolling on overflow in flex columns)", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).not.toMatch(/#htllm-threads\s*\{[^}]*justify-content:\s*flex-end/);
    expect(body).toMatch(/\.htllm-thread-messages\s*\{[^}]*margin-top:\s*auto/);
  });

  it("gives messages the full panel width instead of side-aligned bubbles", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).not.toMatch(/\.htllm-thread-msg-user\s*\{[^}]*align-self/);
    expect(body).not.toMatch(/\.htllm-thread-msg\s*\{[^}]*max-width/);
  });

  it("distinguishes the speaker by background alone, without a wrapping thread card", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/\.htllm-thread-msg-user\s*\{[^}]*background/);
    expect(body).not.toContain(".htllm-thread-card");
  });

  it("pins the composer to the bottom with a visible separator from the thread list", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/#htllm-composer\s*\{[^}]*flex:\s*none/);
    expect(body).toMatch(/#htllm-composer\s*\{[^}]*border-top/);
  });

  it("gives the panel a control to leave a thread and go back to the list", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain('id="htllm-panel-back"');
  });

  it("loads the thread list from the server so past threads survive a reload", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toContain('fetch("/api/threads")');
  });

  it("no longer mentions the removed text-selection UI", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).not.toContain("テキストを選択");
    expect(body).not.toContain("data-thread-id]");
  });

  it("generates different HTML for different content", async () => {
    const otherJsx = "<h1>Different content</h1>";
    const otherServer = createServer(otherJsx, onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => otherServer.listen(0, resolve));
    const address = otherServer.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const res = await fetch(`http://localhost:${port}`);
    const body = await res.text();
    otherServer.close();

    expect(body).toContain(otherJsx);
    expect(body).not.toContain(jsx);
  });
});

describe("POST /api/threads", () => {
  let server: Server;
  let baseUrl: string;
  let onCreateThread: ReturnType<typeof vi.fn<CreateThreadHandler>>;
  let onReply: ReturnType<typeof vi.fn<ReplyThreadHandler>>;
  let onGetThread: ReturnType<typeof vi.fn<GetThreadHandler>>;
  let onDeleteThread: ReturnType<typeof vi.fn<DeleteThreadHandler>>;
  let onListThreads: ReturnType<typeof vi.fn<ListThreadsHandler>>;

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200", async () => {
    onCreateThread.mockResolvedValue({ threadId: "t1", jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "これは？" }),
    });

    expect(res.status).toBe(200);
  });

  it("calls onCreateThread with the fields from the request body", async () => {
    onCreateThread.mockResolvedValue({ threadId: "t1", jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "これは？" }),
    });

    expect(onCreateThread).toHaveBeenCalledWith({ message: "これは？" });
  });

  it("returns threadId/jsx as JSON", async () => {
    onCreateThread.mockResolvedValue({ threadId: "t1", jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "短くして" }),
    });
    const body = await res.json();

    expect(body).toEqual({ threadId: "t1", jsx: "<h1>updated</h1>" });
  });

  it("reflects the updated jsx on subsequent GET /", async () => {
    onCreateThread.mockResolvedValue({ threadId: "t1", jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "これは？" }),
    });

    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("<h1>updated</h1>");
  });

  it("returns status 400 with an error message when onCreateThread rejects", async () => {
    onCreateThread.mockRejectedValue(new Error("node not found: n1"));

    const res = await fetch(`${baseUrl}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "これは？" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "node not found: n1" });
  });
});

describe("POST /api/threads/:id/reply", () => {
  let server: Server;
  let baseUrl: string;
  let onCreateThread: ReturnType<typeof vi.fn<CreateThreadHandler>>;
  let onReply: ReturnType<typeof vi.fn<ReplyThreadHandler>>;
  let onGetThread: ReturnType<typeof vi.fn<GetThreadHandler>>;
  let onDeleteThread: ReturnType<typeof vi.fn<DeleteThreadHandler>>;
  let onListThreads: ReturnType<typeof vi.fn<ListThreadsHandler>>;

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200", async () => {
    onReply.mockResolvedValue({ jsx: "<h1>updated</h1>", answer: "続きの回答" });

    const res = await fetch(`${baseUrl}/api/threads/t1/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "じゃあこの場合は？" }),
    });

    expect(res.status).toBe(200);
  });

  it("calls onReply with the threadId from the URL and message from the body", async () => {
    onReply.mockResolvedValue({ jsx: "<h1>updated</h1>", answer: "続きの回答" });

    await fetch(`${baseUrl}/api/threads/t1/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "じゃあこの場合は？" }),
    });

    expect(onReply).toHaveBeenCalledWith("t1", "じゃあこの場合は？");
  });

  it("returns jsx/answer as JSON", async () => {
    onReply.mockResolvedValue({ jsx: "<h1>updated</h1>", answer: "続きの回答" });

    const res = await fetch(`${baseUrl}/api/threads/t1/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "じゃあこの場合は？" }),
    });
    const body = await res.json();

    expect(body).toEqual({ jsx: "<h1>updated</h1>", answer: "続きの回答" });
  });

  it("returns status 400 with an error message when onReply rejects", async () => {
    onReply.mockRejectedValue(new Error("thread not found: t1"));

    const res = await fetch(`${baseUrl}/api/threads/t1/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "じゃあこの場合は？" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "thread not found: t1" });
  });
});

describe("GET /api/threads/:id", () => {
  let server: Server;
  let baseUrl: string;
  let onCreateThread: ReturnType<typeof vi.fn<CreateThreadHandler>>;
  let onReply: ReturnType<typeof vi.fn<ReplyThreadHandler>>;
  let onGetThread: ReturnType<typeof vi.fn<GetThreadHandler>>;
  let onDeleteThread: ReturnType<typeof vi.fn<DeleteThreadHandler>>;
  let onListThreads: ReturnType<typeof vi.fn<ListThreadsHandler>>;

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns pending:true while the answer is not ready", async () => {
    onGetThread.mockResolvedValue({ pending: true, answer: "", jsx: "<h1>initial</h1>" });

    const res = await fetch(`${baseUrl}/api/threads/t1`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ pending: true, answer: "", jsx: "<h1>initial</h1>" });
  });

  it("returns pending:false with the answer once ready", async () => {
    onGetThread.mockResolvedValue({ pending: false, answer: "回答", jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/threads/t1`);
    const body = await res.json();

    expect(body).toEqual({ pending: false, answer: "回答", jsx: "<h1>updated</h1>" });
  });

  it("calls onGetThread with the id from the URL", async () => {
    onGetThread.mockResolvedValue({ pending: true, answer: "", jsx: "<h1>initial</h1>" });

    await fetch(`${baseUrl}/api/threads/abc123`);

    expect(onGetThread).toHaveBeenCalledWith("abc123");
  });

  it("returns status 404 when the thread does not exist", async () => {
    onGetThread.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/threads/missing`);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "thread not found: missing" });
  });
});

describe("GET /api/threads", () => {
  let server: Server;
  let baseUrl: string;
  let onListThreads: ReturnType<typeof vi.fn<ListThreadsHandler>>;

  beforeEach(async () => {
    onListThreads = vi.fn<ListThreadsHandler>();
    server = createServer(
      "<h1>initial</h1>",
      vi.fn<CreateThreadHandler>(),
      vi.fn<ReplyThreadHandler>(),
      vi.fn<GetThreadHandler>(),
      vi.fn<DeleteThreadHandler>(),
      onListThreads,
      vi.fn<UndoHandler>(),
    );
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns every thread with its id, target node and messages", async () => {
    onListThreads.mockResolvedValue([
      { id: "t1", nodeId: "n1", messages: [{ role: "user", text: "これは？" }] },
      { id: "t2", nodeId: null, messages: [] },
    ]);

    const res = await fetch(`${baseUrl}/api/threads`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([
      { id: "t1", nodeId: "n1", messages: [{ role: "user", text: "これは？" }] },
      { id: "t2", nodeId: null, messages: [] },
    ]);
  });

  it("returns an empty array when there are no threads", async () => {
    onListThreads.mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/api/threads`);

    expect(await res.json()).toEqual([]);
  });
});

describe("DELETE /api/threads/:id", () => {
  let server: Server;
  let baseUrl: string;
  let onCreateThread: ReturnType<typeof vi.fn<CreateThreadHandler>>;
  let onReply: ReturnType<typeof vi.fn<ReplyThreadHandler>>;
  let onGetThread: ReturnType<typeof vi.fn<GetThreadHandler>>;
  let onDeleteThread: ReturnType<typeof vi.fn<DeleteThreadHandler>>;
  let onListThreads: ReturnType<typeof vi.fn<ListThreadsHandler>>;

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread, onListThreads, vi.fn<UndoHandler>());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200 with the updated jsx", async () => {
    onDeleteThread.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/threads/t1`, { method: "DELETE" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ jsx: "<h1>updated</h1>" });
  });

  it("calls onDeleteThread with the id from the URL", async () => {
    onDeleteThread.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/threads/abc123`, { method: "DELETE" });

    expect(onDeleteThread).toHaveBeenCalledWith("abc123");
  });

  it("reflects the updated jsx on subsequent GET /", async () => {
    onDeleteThread.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/threads/t1`, { method: "DELETE" });

    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("<h1>updated</h1>");
  });

  it("returns status 404 when the thread does not exist", async () => {
    onDeleteThread.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/threads/missing`, { method: "DELETE" });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "thread not found: missing" });
  });

  it("returns status 400 with an error message when onDeleteThread rejects", async () => {
    onDeleteThread.mockRejectedValue(new Error("boom"));

    const res = await fetch(`${baseUrl}/api/threads/t1`, { method: "DELETE" });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "boom" });
  });
});

describe("POST /api/undo", () => {
  let server: Server;
  let baseUrl: string;
  let onUndo: ReturnType<typeof vi.fn<UndoHandler>>;

  beforeEach(async () => {
    onUndo = vi.fn<UndoHandler>();
    const onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    server = createServer(
      "<h1>initial</h1>",
      vi.fn<CreateThreadHandler>(),
      vi.fn<ReplyThreadHandler>(),
      vi.fn<GetThreadHandler>(),
      vi.fn<DeleteThreadHandler>(),
      onListThreads,
      onUndo,
    );
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200 with the restored jsx", async () => {
    onUndo.mockResolvedValue({ jsx: "<h1>restored</h1>", canUndo: false });

    const res = await fetch(`${baseUrl}/api/undo`, { method: "POST" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ jsx: "<h1>restored</h1>", canUndo: false });
  });

  it("reflects the restored jsx on subsequent GET /", async () => {
    onUndo.mockResolvedValue({ jsx: "<h1>restored</h1>", canUndo: false });

    await fetch(`${baseUrl}/api/undo`, { method: "POST" });
    const res = await fetch(baseUrl);

    expect(await res.text()).toContain("<h1>restored</h1>");
  });

  it("returns status 409 when there is nothing to undo", async () => {
    onUndo.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/undo`, { method: "POST" });

    expect(res.status).toBe(409);
  });
});

describe("元に戻すボタン", () => {
  it("送信ボタンの左に、初期状態では押せない状態で置かれる", async () => {
    const onListThreads = vi.fn<ListThreadsHandler>();
    onListThreads.mockResolvedValue([]);
    const server = createServer(
      "<h1>x</h1>",
      vi.fn<CreateThreadHandler>(),
      vi.fn<ReplyThreadHandler>(),
      vi.fn<GetThreadHandler>(),
      vi.fn<DeleteThreadHandler>(),
      onListThreads,
      vi.fn<UndoHandler>(),
    );
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const html = await (await fetch(`http://localhost:${port}`)).text();
    server.close();

    const undoIndex = html.indexOf("htllm-composer-undo-btn");
    const submitIndex = html.indexOf("htllm-composer-submit-btn");
    expect(undoIndex).toBeGreaterThan(-1);
    expect(undoIndex).toBeLessThan(submitIndex);
    expect(html).toContain('id="htllm-composer-undo-btn" disabled');
  });
});
