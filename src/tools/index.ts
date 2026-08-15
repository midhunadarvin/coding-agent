import type { FileStore } from "../file/interface.ts";
import type { LlmProvider } from "../llm/types.ts";
import type { Skill } from "../skills/types.ts";
import { createBashTool } from "./bash.ts";
import { createEditFileTool } from "./edit.ts";
import { createExploreAgentTool } from "./explore-agent.ts";
import { createGlobTool } from "./glob.ts";
import { createGrepTool } from "./grep.ts";
import { createLsTool } from "./ls.ts";
import { createReadFileTool } from "./read-file.ts";
import { createReadSkillTool } from "./read-skill.ts";
import { createSubmitPlanTool, type TurnState } from "./submit-plan.ts";
import { createTodoWriteTool, type TodoItem } from "./todo.ts";
import { createWriteFileTool } from "./write-file.ts";
import type { Tool } from "./types.ts";

export type { Tool } from "./types.ts";
export { createBashTool } from "./bash.ts";
export { denyReason } from "./bash.ts";
export { createEditFileTool, countOccurrences } from "./edit.ts";
export { createExploreAgentTool } from "./explore-agent.ts";
export { createGlobTool } from "./glob.ts";
export { createGrepTool } from "./grep.ts";
export { createLsTool } from "./ls.ts";
export { createReadFileTool } from "./read-file.ts";
export { createReadSkillTool } from "./read-skill.ts";
export { createSubmitPlanTool, MUTATING_TOOLS, type TurnState } from "./submit-plan.ts";
export { createTodoWriteTool, type TodoItem } from "./todo.ts";
export { createWriteFileTool } from "./write-file.ts";
export { prepareToolCall, runPreparedTool, type PreparedToolCall } from "./runtime.ts";

export interface AgentToolOptions {
  files: FileStore;
  llm: LlmProvider;
  skills: Skill[];
  todos: TodoItem[];
  turn: TurnState;
}

export function createFileTools(files: FileStore): Tool[] {
  return [createReadFileTool(files), createWriteFileTool(files), createEditFileTool(files)];
}

export function createAgentTools(options: AgentToolOptions): Tool[] {
  const readOnly = [
    createReadFileTool(options.files),
    createGrepTool(options.files),
    createGlobTool(options.files),
    createLsTool(options.files),
  ];

  return [
    ...readOnly,
    createWriteFileTool(options.files),
    createEditFileTool(options.files),
    createBashTool(options.files),
    createTodoWriteTool(options.todos),
    createSubmitPlanTool(options.turn),
    createReadSkillTool(options.skills),
    createExploreAgentTool(options.llm, readOnly),
  ];
}
