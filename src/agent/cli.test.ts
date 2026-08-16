import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCliArgs } from "./cli.ts";

describe("parseCliArgs", () => {
  it("defaults to a single-agent run", () => {
    assert.deepEqual(parseCliArgs([]), { kind: "run", session: undefined, docker: undefined });
  });

  it("parses a named session and docker container", () => {
    assert.deepEqual(parseCliArgs(["--session", "auth", "--docker", "agent-auth"]), {
      kind: "run",
      session: "auth",
      docker: "agent-auth",
    });
  });

  it("parses list and clean", () => {
    assert.deepEqual(parseCliArgs(["--list"]), { kind: "list" });
    assert.deepEqual(parseCliArgs(["--clean", "auth", "--force"]), {
      kind: "clean",
      session: "auth",
      force: true,
    });
  });
});
