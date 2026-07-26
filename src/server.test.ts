import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import type { Server } from "node:http";

const runTurnMock = vi.fn();
vi.mock("./claude/runTurn.js", () => ({
  runTurn: (...args: unknown[]) => runTurnMock(...args),
}));

const { createServer } = await import("./server.js");

describe("createServer", () => {
  let server: Server;
  let baseUrl: string;

  const jsx = "<h1>Hello htllm</h1>";

  beforeAll(async () => {
    server = createServer(jsx);
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
    expect(body).toContain(`<script type="text/babel">${jsx}</script>`);
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

  it("generates different HTML for different content", async () => {
    const otherJsx = "<h1>Different content</h1>";
    const otherServer = createServer(otherJsx);
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

describe("POST /api/turn", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    runTurnMock.mockReset();
    server = createServer("<h1>initial</h1>");
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>updated</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });

    expect(res.status).toBe(200);
  });

  it("returns the runTurn result as jsx/sessionId/stopReason JSON", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>updated</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });
    const body = await res.json();

    expect(body).toEqual({
      jsx: "<h1>updated</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });
  });

  it("calls runTurn with the prompt from the request body", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>updated</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });

    expect(runTurnMock).toHaveBeenCalledWith("hello", expect.anything());
  });

  it("passes the previous sessionId as resumeSessionId on the second call", async () => {
    runTurnMock.mockResolvedValueOnce({
      result: "<h1>first</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });
    runTurnMock.mockResolvedValueOnce({
      result: "<h1>second</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "first" }),
    });
    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "second" }),
    });

    expect(runTurnMock).toHaveBeenNthCalledWith(2, "second", {
      resumeSessionId: "session-1",
    });
  });

  it("reflects the updated jsx on subsequent GET /", async () => {
    runTurnMock.mockResolvedValue({
      result: "<h1>updated</h1>",
      sessionId: "session-1",
      stopReason: "end_turn",
    });

    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hello" }),
    });

    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("<h1>updated</h1>");
  });
});
