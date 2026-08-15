import type { PermissionMode } from "./types.ts";

export function loadPermissionMode(): PermissionMode {
  const raw = process.env.TOOL_PERMISSIONS?.trim().toLowerCase();
  if (raw === "allow" || raw === "deny" || raw === "prompt") {
    return raw;
  }
  return process.stdin.isTTY ? "prompt" : "deny";
}
