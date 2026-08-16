import path from "node:path";
import type { FileStore, WorkspaceRoot } from "./interface.ts";
import { createMultiRepoFileStore } from "./multi.ts";
import { createWorkspaceFileStore } from "./workspace.ts";

export function createAgentFileStore(cwd: string = process.cwd()): FileStore {
  const primary = createWorkspaceFileStore(cwd);
  const extras = parseAgentRepos(process.env.AGENT_REPOS, cwd);
  if (extras.length === 0) {
    return primary;
  }
  return createMultiRepoFileStore(primary, extras);
}

export function parseAgentRepos(
  raw: string | undefined,
  cwd: string = process.cwd(),
): WorkspaceRoot[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  const roots: WorkspaceRoot[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const split = trimmed.indexOf("=");
    if (split <= 0) {
      throw new Error(`Invalid AGENT_REPOS entry: ${trimmed} (expected name=/path)`);
    }
    const name = trimmed.slice(0, split).trim();
    const repoPath = trimmed.slice(split + 1).trim();
    if (!/^[A-Za-z][\w-]+$/.test(name) || name.length < 2) {
      throw new Error(`Invalid repo name: ${name}`);
    }
    roots.push({ name, root: path.resolve(cwd, repoPath) });
  }
  return roots;
}
