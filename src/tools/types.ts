import type { ToolDefinition } from "../llm/types.ts";

export interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}
