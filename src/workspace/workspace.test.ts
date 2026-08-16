import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { createWorkspaceFileStore } from "./workspace.ts";

describe("workspace path sandbox", () => {
  it("rejects paths outside the workspace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "coding-agent-"));
    const files = createWorkspaceFileStore(root);
    assert.throws(() => files.resolve("../secret.txt"), /outside the workspace/);
  });

  it("reads a file inside the workspace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "coding-agent-"));
    await writeFile(path.join(root, "note.txt"), "hello", "utf8");
    const files = createWorkspaceFileStore(root);
    assert.equal(await files.read("note.txt"), "hello");
  });
});
