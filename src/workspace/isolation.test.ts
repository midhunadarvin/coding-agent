import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertIsolatedPath,
  denyIsolatedCommand,
  isInside,
} from "./isolation.ts";

const policy = {
  sessionRoot: "/repo/.coding-agent/worktrees/auth",
  mainRoot: "/repo",
};

describe("worktree isolation", () => {
  it("allows paths inside the session worktree", () => {
    assert.equal(isInside("/repo/.coding-agent/worktrees/auth/src/a.ts", policy.sessionRoot), true);
    assert.doesNotThrow(() =>
      assertIsolatedPath("/repo/.coding-agent/worktrees/auth/src/a.ts", policy),
    );
  });

  it("blocks paths in the main checkout", () => {
    assert.throws(
      () => assertIsolatedPath("/repo/src/index.ts", policy),
      /main checkout/,
    );
  });

  it("blocks git redirects in bash", () => {
    assert.match(
      denyIsolatedCommand("git -C /repo status", policy.sessionRoot, policy) ?? "",
      /redirects/,
    );
    assert.match(
      denyIsolatedCommand("git status", "/repo", policy) ?? "",
      /main checkout/,
    );
    assert.equal(
      denyIsolatedCommand("git status", policy.sessionRoot, policy),
      undefined,
    );
  });
});
