import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shellEscape, wrapSandboxedCommand } from "./sandbox.ts";

describe("sandbox wrapper", () => {
  it("returns the command unchanged without a prefix", () => {
    assert.equal(wrapSandboxedCommand("npm test", ""), "npm test");
  });

  it("wraps the command for a remote prefix", () => {
    const wrapped = wrapSandboxedCommand("npm test", "docker exec -w /work agent");
    assert.equal(wrapped, `docker exec -w /work agent sh -c ${shellEscape("npm test")}`);
  });
});
