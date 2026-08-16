import type { ChatMessage, LlmProvider } from "../llm/types.ts";
import { createPermissionGate } from "../agent/permissions/gate.ts";
import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import { prepareToolCall, runPreparedTool } from "./runtime.ts";
import type { Tool } from "./types.ts";

const MAX_EXPLORE_ROUNDS = 8;

export function createExploreAgentTool(llm: LlmProvider, readOnlyTools: Tool[]): Tool {
  return {
    definition: {
      name: "explore",
      description:
        "Spawn a read-only subagent to answer a question about the codebase. Use for open-ended exploration so the main thread stays small.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string", description: "What to find out" },
        },
        required: ["question"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const question = requireString(args, "question");
      const allow = createPermissionGate({
        mode: "allow",
        ask: async () => "y",
      });
      const definitions = readOnlyTools.map((tool) => tool.definition);
      const history: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a read-only explore agent. Use grep, glob, ls, and read_file only. Do not suggest applying edits. End with a concise summary of what you found.",
        },
        { role: "user", content: question },
      ];

      try {
        for (let round = 0; round < MAX_EXPLORE_ROUNDS; round += 1) {
          const response = await llm.chat({
            messages: history,
            tools: definitions,
          });

          if (response.toolCalls.length === 0) {
            return `OK explore\n${response.content ?? "No findings."}`;
          }

          history.push({
            role: "assistant",
            content: response.content,
            toolCalls: response.toolCalls,
          });

          for (const call of response.toolCalls) {
            const prepared = prepareToolCall(readOnlyTools, call.name, call.arguments);
            let result: string;
            if (typeof prepared === "string") {
              result = prepared;
            } else {
              const decision = await allow.authorize({
                tool: call.name,
                arguments: prepared.args,
              });
              result =
                decision === "deny"
                  ? "Permission denied."
                  : await runPreparedTool(prepared);
            }
            history.push({
              role: "tool",
              toolCallId: call.id,
              name: call.name,
              content: result,
            });
          }
        }

        return "OK explore\nReached the explore round limit without a final summary.";
      } catch (error) {
        return structuredError(
          "explore",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  };
}
