import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPermissionGate } from "./gate.ts";

describe("permission modes", () => {
  it("allows every call in allow mode", async () => {
    const gate = createPermissionGate({
      mode: "allow",
      ask: async () => {
        throw new Error("should not prompt");
      },
    });
    assert.equal(await gate.authorize({ tool: "read_file", arguments: {} }), "allow");
  });

  it("denies every call in deny mode", async () => {
    const gate = createPermissionGate({
      mode: "deny",
      ask: async () => "y",
    });
    assert.equal(await gate.authorize({ tool: "write_file", arguments: {} }), "deny");
  });

  it("remembers always for one tool", async () => {
    const answers = ["a"];
    const gate = createPermissionGate({
      mode: "prompt",
      ask: async () => answers.shift() ?? "n",
    });
    assert.equal(await gate.authorize({ tool: "read_file", arguments: {} }), "allow");
    assert.equal(await gate.authorize({ tool: "read_file", arguments: {} }), "allow");
  });
});
