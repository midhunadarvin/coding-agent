import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export interface TurnState {
  planned: boolean;
}

export const MUTATING_TOOLS = new Set(["write_file", "edit", "bash"]);

export function createSubmitPlanTool(turn: TurnState): Tool {
  return {
    definition: {
      name: "submit_plan",
      description:
        "Submit a short plan before mutating files or running shell commands. Required once per user turn before write_file, edit, or bash.",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string", description: "Brief plan of the change" },
        },
        required: ["plan"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      try {
        const plan = requireString(args, "plan");
        turn.planned = true;
        return `OK submit_plan\n${plan}`;
      } catch (error) {
        return structuredError("submit_plan", error instanceof Error ? error.message : String(error));
      }
    },
  };
}
