import { describe, it, expect } from "vitest";
import { renderDocument } from "./render.js";

describe("renderDocument", () => {
  it("includes the document's text", () => {
    const jsx = renderDocument({ text: "Hello htllm" });

    expect(jsx).toContain("Hello htllm");
  });
});
