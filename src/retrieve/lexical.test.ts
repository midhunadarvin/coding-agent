import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cosineSimilarity, embedText } from "./lexical.ts";

describe("lexical embeddings", () => {
  it("ranks a matching snippet above an unrelated one", () => {
    const query = embedText("permission gate allow or deny tool calls");
    const related = embedText(
      "createPermissionGate authorizes each tool call with allow deny or prompt",
    );
    const unrelated = embedText("spinner frames and banner logo colors");
    assert.ok(cosineSimilarity(query, related) > cosineSimilarity(query, unrelated));
  });
});
