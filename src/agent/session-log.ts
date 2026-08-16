import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface SessionLog {
  record(event: string, data?: unknown): Promise<void>;
}

export async function createSessionLog(
  cwd: string = process.cwd(),
): Promise<SessionLog | undefined> {
  if (process.env.SESSION_LOG !== "1") {
    return undefined;
  }

  const directory = path.join(cwd, ".coding-agent", "sessions");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${new Date().toISOString().replaceAll(":", "-")}.jsonl`);

  return {
    async record(event: string, data?: unknown): Promise<void> {
      const line = JSON.stringify({ time: new Date().toISOString(), event, data }) + "\n";
      await appendFile(filePath, line, "utf8");
    },
  };
}
