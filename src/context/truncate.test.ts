import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { truncateOutput } from "./truncate.ts";

describe("truncateOutput", () => {
  it("leaves short text alone", () => {
    assert.equal(truncateOutput("hello", 20), "hello");
  });

  it("caps long text and reports the remainder", () => {
    const result = truncateOutput("abcdefghij", 4);
    assert.equal(result.startsWith("abcd"), true);
    assert.match(result, /truncated 6 characters/);
  });
});
