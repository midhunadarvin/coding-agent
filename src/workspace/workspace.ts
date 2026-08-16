import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DirEntry, FileStore, WorkspaceRoot } from "./interface.ts";

export function createWorkspaceFileStore(root: string = process.cwd()): FileStore {
  return new WorkspaceFileStore(root);
}

class WorkspaceFileStore implements FileStore {
  readonly root: string;
  private readonly alias: string;

  constructor(root: string, alias?: string) {
    this.root = path.resolve(root);
    this.alias = alias ?? path.basename(this.root) ?? "workspace";
  }

  roots(): WorkspaceRoot[] {
    return [{ name: this.alias, root: this.root }];
  }

  toLogicalPath(absolutePath: string): string {
    return path.relative(this.root, absolutePath).replaceAll("\\", "/");
  }

  async read(filePath: string): Promise<string> {
    return readFile(this.resolve(filePath), "utf8");
  }

  async write(filePath: string, content: string): Promise<void> {
    const resolved = this.resolve(filePath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await writeFile(resolved, content, "utf8");
  }

  resolve(filePath: string): string {
    const resolved = path.resolve(this.root, filePath);
    const prefix = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    if (resolved !== this.root && !resolved.startsWith(prefix)) {
      throw new Error(`Path is outside the workspace: ${filePath}`);
    }
    return resolved;
  }

  async list(dirPath = "."): Promise<DirEntry[]> {
    const resolved = this.resolve(dirPath);
    const entries = await readdir(resolved, { withFileTypes: true });
    return entries
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? ("dir" as const) : ("file" as const),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}
