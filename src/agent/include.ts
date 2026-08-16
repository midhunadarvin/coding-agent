import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_INCLUDES = [".env"];

export async function copyWorktreeIncludes(mainRoot: string, worktreePath: string): Promise<string[]> {
  const names = await readIncludeList(mainRoot);
  const copied: string[] = [];
  for (const name of names) {
    if (name.includes("..") || path.isAbsolute(name)) {
      continue;
    }
    const from = path.join(mainRoot, name);
    const to = path.join(worktreePath, name);
    try {
      await copyFile(from, to);
      copied.push(name);
    } catch {
      // Missing source is fine.
    }
  }
  return copied;
}

async function readIncludeList(mainRoot: string): Promise<string[]> {
  try {
    const raw = await readFile(path.join(mainRoot, ".worktreeinclude"), "utf8");
    const listed = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    return listed.length > 0 ? listed : DEFAULT_INCLUDES;
  } catch {
    return DEFAULT_INCLUDES;
  }
}
