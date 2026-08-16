import { mkdir } from "node:fs/promises";
import path from "node:path";
import { copyWorktreeIncludes } from "./include.ts";
import type { IsolationPolicy } from "../workspace/isolation.ts";
import {
  branchExists,
  requireGitRoot,
  runGit,
  worktreeHasChanges,
} from "./git.ts";

export const SESSION_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface AgentSession {
  name: string;
  branch: string;
  path: string;
  mainRoot: string;
  isolation: IsolationPolicy;
  created: boolean;
}

export function sessionBranch(name: string): string {
  return `agent/${name}`;
}

export function worktreePath(gitRoot: string, name: string): string {
  return path.join(gitRoot, ".coding-agent", "worktrees", name);
}

export async function prepareWorktreeSession(
  name: string,
  cwd: string = process.cwd(),
): Promise<AgentSession> {
  assertSessionName(name);
  const mainRoot = await requireGitRoot(cwd);
  const destination = worktreePath(mainRoot, name);
  const branch = sessionBranch(name);
  const existing = await runGit(["rev-parse", "--show-toplevel"], destination);
  let created = false;

  if (existing.code === 0 && path.resolve(existing.stdout) === destination) {
    // Resume.
  } else {
    await mkdir(path.dirname(destination), { recursive: true });
    const args = (await branchExists(mainRoot, branch))
      ? ["worktree", "add", destination, branch]
      : ["worktree", "add", "-b", branch, destination];
    const added = await runGit(args, mainRoot);
    if (added.code !== 0) {
      throw new Error(added.stderr || `Failed to create worktree ${name}`);
    }
    created = true;
    const copied = await copyWorktreeIncludes(mainRoot, destination);
    if (copied.length > 0) {
      process.stderr.write(`Copied into worktree: ${copied.join(", ")}\n`);
    }
  }

  return {
    name,
    branch,
    path: destination,
    mainRoot,
    created,
    isolation: { sessionRoot: destination, mainRoot },
  };
}

export async function listWorktreeSessions(
  cwd: string = process.cwd(),
): Promise<Array<{ name: string; path: string; branch: string }>> {
  const mainRoot = await requireGitRoot(cwd);
  const listed = await runGit(["worktree", "list", "--porcelain"], mainRoot);
  if (listed.code !== 0) {
    throw new Error(listed.stderr || "Failed to list worktrees");
  }

  const sessions: Array<{ name: string; path: string; branch: string }> = [];
  const prefix = `${worktreePath(mainRoot, "")}`;
  let currentPath = "";
  let currentBranch = "";

  for (const line of listed.stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (currentPath.startsWith(prefix)) {
        sessions.push({
          name: path.basename(currentPath),
          path: currentPath,
          branch: currentBranch,
        });
      }
      currentPath = line.slice("worktree ".length);
      currentBranch = "";
    } else if (line.startsWith("branch refs/heads/")) {
      currentBranch = line.slice("branch refs/heads/".length);
    }
  }
  if (currentPath.startsWith(prefix)) {
    sessions.push({
      name: path.basename(currentPath),
      path: currentPath,
      branch: currentBranch,
    });
  }
  return sessions;
}

export async function removeWorktreeSession(
  name: string,
  options: { force?: boolean } = {},
  cwd: string = process.cwd(),
): Promise<void> {
  assertSessionName(name);
  const mainRoot = await requireGitRoot(cwd);
  const destination = worktreePath(mainRoot, name);
  if (!options.force && (await worktreeHasChanges(destination))) {
    throw new Error(
      `Session ${name} has uncommitted changes. Commit them or pass --force.`,
    );
  }
  const removed = await runGit(
    ["worktree", "remove", ...(options.force ? ["--force"] : []), destination],
    mainRoot,
  );
  if (removed.code !== 0) {
    throw new Error(removed.stderr || `Failed to remove worktree ${name}`);
  }
}

export function assertSessionName(name: string): void {
  if (!SESSION_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid session name '${name}'. Use letters, numbers, '.', '_' or '-'.`,
    );
  }
}
