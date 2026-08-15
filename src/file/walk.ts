import { readdir } from "node:fs/promises";
import path from "node:path";

export const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".coding-agent",
  "node_modules",
  "dist",
  "coverage",
]);

export async function* walkWorkspaceFiles(
  root: string,
  directory = root,
): AsyncGenerator<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      yield* walkWorkspaceFiles(root, path.join(directory, entry.name));
      continue;
    }
    if (entry.isFile()) {
      yield path.relative(root, path.join(directory, entry.name));
    }
  }
}
