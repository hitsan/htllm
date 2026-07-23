import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./server.js";
import type { Server } from "node:http";

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

  it("returns Content-Type text/html", async () => {
    const res = await fetch(baseUrl);
    expect(res.headers.get("content-type")).toBe("text/html");
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
