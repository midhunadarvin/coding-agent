import type { SkillMeta } from "../skills/types.ts";

export function buildSystemPrompt(options: {
  agentsMd?: string;
  skills?: SkillMeta[];
}): string {
  const sections = [CORE_RULES];

  if (options.skills && options.skills.length > 0) {
    const list = options.skills
      .map((skill) => `- ${skill.name}: ${skill.description}`)
      .join("\n");
    sections.push(
      `## Skills\nLoad a skill with read_skill before following it.\n${list}`,
    );
  }

  if (options.agentsMd) {
    sections.push(`## Project memory (AGENTS.md)\n${options.agentsMd}`);
  }

  return sections.join("\n\n");
}

const CORE_RULES = `You are a coding agent working in the current workspace.

## How to work
- Search or read before you edit. Do not invent file paths.
- Prefer edit for a local change. Use write_file only for new files or full rewrites.
- Match existing style. Do not add comments, docs, or refactors the user did not ask for.
- One concern per change.
- For any change that writes files or runs the shell, call submit_plan first with a short plan.

## How to finish
- After a code change, follow the verify skill: run the project checks, read failures, and fix them.
- If a search finds nothing, say so. Do not fabricate files or APIs.
- Use todo_write for work that takes more than three steps.

## Safety
- Stay inside the workspace.
- Do not print or commit secrets.
- Do not run destructive git commands (reset --hard, push --force) unless the user asked.`;
