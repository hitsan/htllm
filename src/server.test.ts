import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "./server.js";
import type { Server } from "node:http";
import type { CreateThreadHandler, ReplyThreadHandler, GetThreadHandler, DeleteThreadHandler } from "./server.js";

describe("createServer", () => {
  let server: Server;
  let baseUrl: string;

  const jsx = "<h1>Hello htllm</h1>";
  const onCreateThread = vi.fn<CreateThreadHandler>();
  const onReply = vi.fn<ReplyThreadHandler>();
  const onGetThread = vi.fn<GetThreadHandler>();
  const onDeleteThread = vi.fn<DeleteThreadHandler>();

  beforeAll(async () => {
    server = createServer(jsx, onCreateThread, onReply, onGetThread, onDeleteThread);
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
    expect(body).toMatch(/\.htllm-thread-card\s*\{[^}]*margin-top:\s*auto/);
  });

  it("pins the composer to the bottom with a visible separator from the thread list", async () => {
    const res = await fetch(baseUrl);
    const body = await res.text();
    expect(body).toMatch(/#htllm-composer\s*\{[^}]*flex:\s*none/);
    expect(body).toMatch(/#htllm-composer\s*\{[^}]*border-top/);
  });

  it("generates different HTML for different content", async () => {
    const otherJsx = "<h1>Different content</h1>";
    const otherServer = createServer(otherJsx, onCreateThread, onReply, onGetThread, onDeleteThread);
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

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread);
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

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread);
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

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread);
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

describe("DELETE /api/threads/:id", () => {
  let server: Server;
  let baseUrl: string;
  let onCreateThread: ReturnType<typeof vi.fn<CreateThreadHandler>>;
  let onReply: ReturnType<typeof vi.fn<ReplyThreadHandler>>;
  let onGetThread: ReturnType<typeof vi.fn<GetThreadHandler>>;
  let onDeleteThread: ReturnType<typeof vi.fn<DeleteThreadHandler>>;

  beforeEach(async () => {
    onCreateThread = vi.fn<CreateThreadHandler>();
    onReply = vi.fn<ReplyThreadHandler>();
    onGetThread = vi.fn<GetThreadHandler>();
    onDeleteThread = vi.fn<DeleteThreadHandler>();
    server = createServer("<h1>initial</h1>", onCreateThread, onReply, onGetThread, onDeleteThread);
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
