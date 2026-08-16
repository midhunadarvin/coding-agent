import path from "node:path";
import type { DirEntry, FileStore } from "./interface.ts";

export function createMemoryFileStore(
  initial: Record<string, string> = {},
  root = "/workspace",
): FileStore {
  const files = new Map<string, string>(
    Object.entries(initial).map(([key, value]) => [normalize(key), value]),
  );

  return {
    root,
    roots: () => [{ name: "workspace", root }],
    toLogicalPath(absolutePath: string): string {
      return normalize(path.relative(root, absolutePath));
    },
    async read(filePath: string): Promise<string> {
      const resolved = this.resolve(filePath);
      const relative = normalize(path.relative(root, resolved));
      const content = files.get(relative);
      if (content === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return content;
    },
    async write(filePath: string, content: string): Promise<void> {
      const resolved = this.resolve(filePath);
      files.set(normalize(path.relative(root, resolved)), content);
    },
    resolve(filePath: string): string {
      const resolved = path.posix.normalize(path.posix.join(root, filePath));
      if (resolved !== root && !resolved.startsWith(`${root}/`)) {
        throw new Error(`Path is outside the workspace: ${filePath}`);
      }
      return resolved;
    },
    async list(dirPath = "."): Promise<DirEntry[]> {
      const prefix = normalize(dirPath);
      const names = new Map<string, DirEntry>();
      for (const filePath of files.keys()) {
        if (prefix !== "." && filePath !== prefix && !filePath.startsWith(`${prefix}/`)) {
          continue;
        }
        const rest = prefix === "." ? filePath : filePath.slice(prefix.length + 1);
        const [name] = rest.split("/");
        if (!name) {
          continue;
        }
        const type = rest.includes("/") ? "dir" : "file";
        names.set(name, { name, type });
      }
      return [...names.values()].sort((left, right) => left.name.localeCompare(right.name));
    },
  };
}

function normalize(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}
