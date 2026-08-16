import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { createMultiRepoFileStore } from "./multi.ts";
import { parseAgentRepos } from "./repos.ts";
import { createMemoryFileStore } from "./memory.ts";
import { createWorkspaceFileStore } from "./workspace.ts";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";

describe("parseAgentRepos", () => {
  it("parses name=path pairs", () => {
    const roots = parseAgentRepos("docs=./docs,api=/tmp/api", "/home/me/app");
    assert.equal(roots.length, 2);
    assert.equal(roots[0]?.name, "docs");
    assert.equal(roots[0]?.root, path.resolve("/home/me/app", "./docs"));
  });
});

describe("multi-repo store", () => {
  it("reads an aliased extra repo", async () => {
    const primary = await mkdtemp(path.join(os.tmpdir(), "agent-primary-"));
    const extra = await mkdtemp(path.join(os.tmpdir(), "agent-docs-"));
    await writeFile(path.join(extra, "guide.md"), "hello docs", "utf8");
    const files = createMultiRepoFileStore(createWorkspaceFileStore(primary), [
      { name: "docs", root: extra },
    ]);
    assert.equal(await files.read("docs:guide.md"), "hello docs");
    assert.match(files.toLogicalPath(path.join(extra, "guide.md")), /^docs:guide.md$/);
  });
});

describe("memory store roots", () => {
  it("exposes a primary root", () => {
    const files = createMemoryFileStore({ "a.ts": "x" });
    assert.equal(files.roots().length, 1);
  });
});
