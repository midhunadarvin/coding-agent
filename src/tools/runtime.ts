import { parseToolArguments } from "./args.ts";
import type { Tool } from "./types.ts";

export interface PreparedToolCall {
  name: string;
  args: Record<string, unknown>;
  tool: Tool;
}

export function prepareToolCall(
  tools: Tool[],
  name: string,
  rawArguments: string,
): PreparedToolCall | string {
  if (!name) {
    return "ERROR tool\nEmpty tool name";
  }

  let args: Record<string, unknown>;
  try {
    args = parseToolArguments(rawArguments || "{}");
  } catch {
    return `ERROR tool\nInvalid JSON arguments: ${rawArguments}`;
  }

  const tool = tools.find((candidate) => candidate.definition.name === name);
  if (!tool) {
    return `ERROR tool\nUnknown tool: ${name}`;
  }

  return { name, args, tool };
}

export async function runPreparedTool(prepared: PreparedToolCall): Promise<string> {
  return prepared.tool.execute(prepared.args);
}
