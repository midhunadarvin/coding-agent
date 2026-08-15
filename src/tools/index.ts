import type { FileStore } from "../file/interface.ts";
import { parseToolArguments } from "./args.ts";
import { createEditFileTool } from "./edit.ts";
import { createReadFileTool } from "./read-file.ts";
import { createWriteFileTool } from "./write-file.ts";
import type { Tool } from "./types.ts";

export type { Tool } from "./types.ts";
export { createEditFileTool } from "./edit.ts";
export { createReadFileTool } from "./read-file.ts";
export { createWriteFileTool } from "./write-file.ts";

export interface PreparedToolCall {
  name: string;
  args: Record<string, unknown>;
  tool: Tool;
}

export function createFileTools(files: FileStore): Tool[] {
  return [createReadFileTool(files), createWriteFileTool(files), createEditFileTool(files)];
}

export function prepareToolCall(
  tools: Tool[],
  name: string,
  rawArguments: string,
): PreparedToolCall | string {
  let args: Record<string, unknown>;
  try {
    args = parseToolArguments(rawArguments);
  } catch {
    return `Invalid JSON arguments: ${rawArguments}`;
  }

  const tool = tools.find((candidate) => candidate.definition.name === name);
  if (!tool) {
    return `Unknown tool: ${name}`;
  }

  return { name, args, tool };
}

export async function runPreparedTool(prepared: PreparedToolCall): Promise<string> {
  return prepared.tool.execute(prepared.args);
}
