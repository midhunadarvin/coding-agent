import type { FileStore } from "../workspace/interface.ts";
import type { LlmProvider } from "../llm/types.ts";
import type { IsolationPolicy } from "../workspace/isolation.ts";
import type { Skill } from "../agent/skills.ts";
import { createBashTool } from "./bash.ts";
import { createEditFileTool } from "./edit.ts";
import { createExploreAgentTool } from "./explore-agent.ts";
import { createGlobTool } from "./glob.ts";
import { createGrepTool } from "./grep.ts";
import { createLspTools } from "./lsp.ts";
import { createLsTool } from "./ls.ts";
import { createReadFileTool } from "./read-file.ts";
import { createReadSkillTool } from "./read-skill.ts";
import { createListReposTool } from "./repos.ts";
import { createSemanticSearchTool } from "./semantic-search.ts";
import { createSubmitPlanTool, type TurnState } from "./submit-plan.ts";
import { createTodoWriteTool, type TodoItem } from "./todo.ts";
import { createWebFetchTool } from "./web-fetch.ts";
import { createWebSearchTool } from "./web-search.ts";
import { createWriteFileTool } from "./write-file.ts";
import type { Tool } from "./types.ts";

export type { Tool } from "./types.ts";
export { createBashTool } from "./bash.ts";
export { denyReason } from "./bash.ts";
export { createEditFileTool, countOccurrences } from "./edit.ts";
export { createExploreAgentTool } from "./explore-agent.ts";
export { createGlobTool } from "./glob.ts";
export { createGrepTool } from "./grep.ts";
export { createLspTools } from "./lsp.ts";
export { createLsTool } from "./ls.ts";
export { createReadFileTool } from "./read-file.ts";
export { createReadSkillTool } from "./read-skill.ts";
export { createListReposTool } from "./repos.ts";
export { wrapSandboxedCommand, shellEscape } from "./sandbox.ts";
export { createSemanticSearchTool } from "./semantic-search.ts";
export { createSubmitPlanTool, MUTATING_TOOLS, type TurnState } from "./submit-plan.ts";
export { createTodoWriteTool, type TodoItem } from "./todo.ts";
export { createWebFetchTool } from "./web-fetch.ts";
export { createWebSearchTool } from "./web-search.ts";
export { createWriteFileTool } from "./write-file.ts";
export { prepareToolCall, runPreparedTool, type PreparedToolCall } from "./runtime.ts";

export interface AgentToolOptions {
  files: FileStore;
  llm: LlmProvider;
  skills: Skill[];
  todos: TodoItem[];
  turn: TurnState;
  isolation?: IsolationPolicy;
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
    createSemanticSearchTool(options.files),
    createListReposTool(options.files),
    createWebFetchTool(),
    createWebSearchTool(),
    ...createLspTools(options.files),
  ];

  return [
    ...readOnly,
    createWriteFileTool(options.files),
    createEditFileTool(options.files),
    createBashTool(options.files, options.isolation),
    createTodoWriteTool(options.todos),
    createSubmitPlanTool(options.turn),
    createReadSkillTool(options.skills),
    createExploreAgentTool(options.llm, readOnly),
  ];
}
