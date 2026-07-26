import { describe, it, expect } from "vitest";
import { renderDocument } from "./render.js";
import { markdownToHtml } from "./markdown.js";

describe("renderDocument", () => {
  it("includes the document's text", () => {
    const jsx = renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("Hello htllm");
  });
});

describe("markdownToHtml", () => {
  it("converts a '# ' line to an h1", () => {
    expect(markdownToHtml("# Title")).toBe("<h1>Title</h1>");
  });

  it("converts a '## ' line to an h2", () => {
    expect(markdownToHtml("## Subtitle")).toBe("<h2>Subtitle</h2>");
  });

  it("converts consecutive '- ' lines into a single ul", () => {
    expect(markdownToHtml("- one\n- two")).toBe("<ul><li>one</li><li>two</li></ul>");
  });

  it("converts a plain line to a paragraph", () => {
    expect(markdownToHtml("plain text")).toBe("<p>plain text</p>");
  });

  it("escapes html tags in the input", () => {
    expect(markdownToHtml("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });
});
