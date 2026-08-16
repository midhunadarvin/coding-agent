import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryFileStore } from "../workspace/memory.ts";
import { countOccurrences, createEditFileTool } from "./edit.ts";

describe("countOccurrences", () => {
  it("counts non-overlapping matches", () => {
    assert.equal(countOccurrences("aaa", "aa"), 1);
    assert.equal(countOccurrences("ababab", "ab"), 3);
  });
});

describe("edit tool", () => {
  it("replaces a unique match", async () => {
    const files = createMemoryFileStore({ "src/a.ts": "const foo = 1;\n" });
    const tool = createEditFileTool(files);
    const result = await tool.execute({
      path: "src/a.ts",
      old_text: "const foo = 1;",
      new_text: "const foo = 2;",
    });
    assert.match(result, /OK edit/);
    assert.equal(await files.read("src/a.ts"), "const foo = 2;\n");
  });

  it("rejects a missing match", async () => {
    const files = createMemoryFileStore({ "src/a.ts": "const foo = 1;\n" });
    const tool = createEditFileTool(files);
    const result = await tool.execute({
      path: "src/a.ts",
      old_text: "missing",
      new_text: "x",
    });
    assert.match(result, /ERROR edit/);
    assert.match(result, /not found/);
  });

  it("rejects a non-unique match", async () => {
    const files = createMemoryFileStore({ "src/a.ts": "foo\nfoo\n" });
    const tool = createEditFileTool(files);
    const result = await tool.execute({
      path: "src/a.ts",
      old_text: "foo",
      new_text: "bar",
    });
    assert.match(result, /ERROR edit/);
    assert.match(result, /2 times/);
  });
});
