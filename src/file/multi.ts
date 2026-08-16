import path from "node:path";
import type { DirEntry, FileStore, WorkspaceRoot } from "./interface.ts";
import { createWorkspaceFileStore } from "./workspace.ts";

export function createMultiRepoFileStore(
  primary: FileStore,
  extras: WorkspaceRoot[],
): FileStore {
  const stores = new Map<string, FileStore>();
  for (const extra of extras) {
    stores.set(extra.name, createWorkspaceFileStore(extra.root));
  }

  return {
    root: primary.root,
    roots(): WorkspaceRoot[] {
      return [...primary.roots(), ...extras];
    },
    toLogicalPath(absolutePath: string): string {
      for (const extra of extras) {
        const prefix = extra.root.endsWith(path.sep) ? extra.root : `${extra.root}${path.sep}`;
        if (absolutePath === extra.root || absolutePath.startsWith(prefix)) {
          const relative = path.relative(extra.root, absolutePath).replaceAll("\\", "/");
          return relative ? `${extra.name}:${relative}` : `${extra.name}:.`;
        }
      }
      return primary.toLogicalPath(absolutePath);
    },
    resolve(filePath: string): string {
      const parsed = parseAlias(filePath, stores);
      return parsed.store.resolve(parsed.relative);
    },
    read(filePath: string): Promise<string> {
      const parsed = parseAlias(filePath, stores);
      return parsed.store.read(parsed.relative);
    },
    write(filePath: string, content: string): Promise<void> {
      const parsed = parseAlias(filePath, stores);
      return parsed.store.write(parsed.relative, content);
    },
    async list(dirPath = "."): Promise<DirEntry[]> {
      if (dirPath === "." || dirPath === "") {
        const entries = await primary.list(".");
        const seen = new Set(entries.map((entry) => entry.name));
        for (const extra of extras) {
          if (!seen.has(extra.name)) {
            entries.push({ name: extra.name, type: "dir" });
          }
        }
        return entries.sort((left, right) => left.name.localeCompare(right.name));
      }
      const parsed = parseAlias(dirPath, stores);
      return parsed.store.list(parsed.relative);
    },
  };

  function parseAlias(
    filePath: string,
    extraStores: Map<string, FileStore>,
  ): { store: FileStore; relative: string } {
    const match = /^([A-Za-z][\w-]*):(.*)$/.exec(filePath);
    if (match && match[1] && match[1].length > 1) {
      const store = extraStores.get(match[1]);
      if (store) {
        return { store, relative: match[2] && match[2].length > 0 ? match[2] : "." };
      }
    }
    return { store: primary, relative: filePath };
  }
}
