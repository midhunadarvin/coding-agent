import path from "node:path";
import type { FileStore } from "./interface.ts";

export interface IsolationPolicy {
  sessionRoot: string;
  mainRoot: string;
}

export function isInside(target: string, root: string): boolean {
  const resolved = path.resolve(target);
  const base = path.resolve(root);
  const prefix = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  return resolved === base || resolved.startsWith(prefix);
}

export function assertIsolatedPath(absolutePath: string, policy: IsolationPolicy): void {
  if (isInside(absolutePath, policy.sessionRoot)) {
    return;
  }
  if (isInside(absolutePath, policy.mainRoot)) {
    throw new Error(
      `Path is in the main checkout, not this session worktree: ${absolutePath}`,
    );
  }
}

export function denyIsolatedCommand(
  command: string,
  cwd: string,
  policy: IsolationPolicy,
): string | undefined {
  const trimmed = command.trim();
  if (/\bgit\s+-C\b/.test(trimmed) || /--git-dir\b/.test(trimmed) || /\bGIT_DIR=/.test(trimmed) || /\bGIT_WORK_TREE=/.test(trimmed)) {
    return "git redirects into another checkout are blocked in a worktree session";
  }
  if (isInside(cwd, policy.mainRoot) && !isInside(cwd, policy.sessionRoot)) {
    return "Command working directory is the main checkout, not this session worktree";
  }
  return undefined;
}

export function isolateFileStore(files: FileStore, policy: IsolationPolicy): FileStore {
  return {
    get root() {
      return files.root;
    },
    roots: () => files.roots(),
    toLogicalPath: (absolutePath) => files.toLogicalPath(absolutePath),
    resolve(filePath: string): string {
      const resolved = files.resolve(filePath);
      assertIsolatedPath(resolved, policy);
      return resolved;
    },
    async read(filePath: string): Promise<string> {
      assertIsolatedPath(files.resolve(filePath), policy);
      return files.read(filePath);
    },
    async write(filePath: string, content: string): Promise<void> {
      assertIsolatedPath(files.resolve(filePath), policy);
      return files.write(filePath, content);
    },
    async list(dirPath?: string) {
      assertIsolatedPath(files.resolve(dirPath ?? "."), policy);
      return files.list(dirPath);
    },
  };
}
