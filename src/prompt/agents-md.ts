import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadAgentsMd(cwd: string = process.cwd()): Promise<string | undefined> {
  try {
    const text = await readFile(path.join(cwd, "AGENTS.md"), "utf8");
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
