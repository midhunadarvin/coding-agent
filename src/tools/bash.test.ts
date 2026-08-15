import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { denyReason } from "./bash.ts";

describe("bash allowlist", () => {
  it("allows typecheck and tests", () => {
    assert.equal(denyReason("npx tsc --noEmit"), undefined);
    assert.equal(denyReason("npm test"), undefined);
    assert.equal(denyReason("git status"), undefined);
  });

  it("blocks destructive commands", () => {
    assert.match(denyReason("git reset --hard") ?? "", /blocked/);
    assert.match(denyReason("git push --force") ?? "", /blocked/);
    assert.match(denyReason("rm -rf /") ?? "", /blocked|allowlist/);
  });
});
