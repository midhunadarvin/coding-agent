import { spawn } from "node:child_process";
import path from "node:path";

export async function runGit(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 1 });
    });
  });
}

export async function requireGitRoot(cwd: string = process.cwd()): Promise<string> {
  const result = await runGit(["rev-parse", "--show-toplevel"], cwd);
  if (result.code !== 0) {
    throw new Error("Not a git repository. --session requires git worktrees.");
  }
  return path.resolve(result.stdout);
}

export async function branchExists(gitRoot: string, branch: string): Promise<boolean> {
  const result = await runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], gitRoot);
  return result.code === 0;
}

export async function worktreeHasChanges(worktreePath: string): Promise<boolean> {
  const result = await runGit(["status", "--porcelain"], worktreePath);
  return result.stdout.length > 0;
}
