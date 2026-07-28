import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "./server.js";
import type { Server } from "node:http";
import type { TurnHandler, AskHandler } from "./server.js";

describe("createServer", () => {
  let server: Server;
  let baseUrl: string;

  const jsx = "<h1>Hello htllm</h1>";
  const onTurn = vi.fn<TurnHandler>();
  const onAsk = vi.fn<AskHandler>();

  beforeAll(async () => {
    server = createServer(jsx, onTurn, onAsk);
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

  it("generates different HTML for different content", async () => {
    const otherJsx = "<h1>Different content</h1>";
    const otherServer = createServer(otherJsx, onTurn, onAsk);
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
  let onTurn: ReturnType<typeof vi.fn<TurnHandler>>;
  let onAsk: ReturnType<typeof vi.fn<AskHandler>>;

  beforeEach(async () => {
    onTurn = vi.fn<TurnHandler>();
    onAsk = vi.fn<AskHandler>();
    server = createServer("<h1>initial</h1>", onTurn, onAsk);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server.close();
  });

  it("returns status 200", async () => {
    onTurn.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "n1", instruction: "hello" }),
    });

    expect(res.status).toBe(200);
  });

  it("calls onTurn with the nodeId and instruction from the request body", async () => {
    onTurn.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "n1", instruction: "hello" }),
    });

    expect(onTurn).toHaveBeenCalledWith("n1", "hello");
  });

  it("returns onTurn's jsx as JSON", async () => {
    onTurn.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "n1", instruction: "hello" }),
    });
    const body = await res.json();

    expect(body).toEqual({ jsx: "<h1>updated</h1>" });
  });

  it("reflects the updated jsx on subsequent GET /", async () => {
    onTurn.mockResolvedValue({ jsx: "<h1>updated</h1>" });

    await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "n1", instruction: "hello" }),
    });

    const res = await fetch(baseUrl);
    const body = await res.text();

    expect(body).toContain("<h1>updated</h1>");
  });

  it("returns status 400 with an error message when onTurn rejects", async () => {
    onTurn.mockRejectedValue(new Error("node not found: n1"));

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: "n1", instruction: "hello" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "node not found: n1" });
  });
});
