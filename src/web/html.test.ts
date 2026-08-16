import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertHttpUrl, htmlToText } from "./html.ts";
import { parseDuckDuckGoLite } from "../tools/web-search.ts";

describe("html helpers", () => {
  it("strips tags and decodes entities", () => {
    assert.equal(htmlToText("<p>Hello&nbsp;<b>world</b></p>"), "Hello world");
  });

  it("rejects non-http URLs", () => {
    assert.throws(() => assertHttpUrl("file:///etc/passwd"), /Only http/);
  });
});

describe("duckduckgo lite parse", () => {
  it("extracts titled http results", () => {
    const html = `
      <a rel="nofollow" href="https://example.com/docs">Example Docs</a>
      <td class="result-snippet">Official documentation</td>
    `;
    const hits = parseDuckDuckGoLite(html, 5);
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.url, "https://example.com/docs");
    assert.equal(hits[0]?.title, "Example Docs");
  });
});
