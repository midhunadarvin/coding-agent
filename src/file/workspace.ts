import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "./interface.ts";

export function createWorkspaceFileStore(root: string = process.cwd()): FileStore {
  return new WorkspaceFileStore(root);
}

class WorkspaceFileStore implements FileStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async read(filePath: string): Promise<string> {
    return readFile(this.resolve(filePath), "utf8");
  }

  async write(filePath: string, content: string): Promise<void> {
    const resolved = this.resolve(filePath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
  }

  private resolve(filePath: string): string {
    const resolved = path.resolve(this.root, filePath);
    const prefix = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    if (resolved !== this.root && !resolved.startsWith(prefix)) {
      throw new Error(`Path is outside the workspace: ${filePath}`);
    }
    return resolved;
  }
}
