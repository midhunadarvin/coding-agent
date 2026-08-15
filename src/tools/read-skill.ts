import type { Skill } from "../skills/types.ts";
import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createReadSkillTool(skills: Skill[]): Tool {
  return {
    definition: {
      name: "read_skill",
      description: "Load the full instructions for a named skill.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Skill name" },
        },
        required: ["name"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const name = requireString(args, "name");
      const skill = skills.find((candidate) => candidate.name === name);
      if (!skill) {
        const available = skills.map((candidate) => candidate.name).join(", ") || "(none)";
        return structuredError("read_skill", `Unknown skill: ${name}`, { available });
      }
      return `OK read_skill\nname: ${skill.name}\n${skill.body}`;
    },
  };
}
