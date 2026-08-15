import path from "node:path";
import { fileURLToPath } from "node:url";
import { printBanner } from "./cli/banner.ts";
import { createWorkspaceFileStore } from "./file/index.ts";
import { createLlmProvider } from "./llm/index.ts";
import { createSessionLog } from "./log/session-log.ts";
import { loadPackageVersion } from "./package-info.ts";
import {
  createPermissionGate,
  loadPermissionMode,
} from "./permissions/index.ts";
import { loadAgentsMd } from "./prompt/agents-md.ts";
import { buildSystemPrompt } from "./prompt/system.ts";
import { createStdio, runSession } from "./session.ts";
import { loadSkills, toSkillMeta } from "./skills/index.ts";
import { createAgentTools, type TodoItem } from "./tools/index.ts";

export { createWorkspaceFileStore, type FileStore } from "./file/index.ts";
export {
  createLlmProvider,
  loadLlmConfig,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ChatRole,
  type LlmConfig,
  type LlmProvider,
  type ToolCall,
  type ToolDefinition,
} from "./llm/index.ts";
export {
  createPermissionGate,
  loadPermissionMode,
  type PermissionDecision,
  type PermissionGate,
  type PermissionMode,
  type PermissionRequest,
} from "./permissions/index.ts";
export { printBanner, renderBanner, type BannerInfo } from "./cli/banner.ts";
export { createStdio, runSession, type InputOutput } from "./session.ts";
export {
  createAgentTools,
  createEditFileTool,
  createFileTools,
  createReadFileTool,
  createWriteFileTool,
  prepareToolCall,
  runPreparedTool,
  type PreparedToolCall,
  type Tool,
} from "./tools/index.ts";

async function main(): Promise<void> {
  const permissionMode = loadPermissionMode();
  const skills = await loadSkills();
  const agentsMd = await loadAgentsMd();
  const systemPrompt = buildSystemPrompt({
    agentsMd,
    skills: toSkillMeta(skills),
  });
  const todos: TodoItem[] = [];
  const turn = { planned: false };
  const llm = createLlmProvider();
  const files = createWorkspaceFileStore();
  const tools = createAgentTools({ files, llm, skills, todos, turn });
  const io = createStdio();
  const permissions = createPermissionGate({
    mode: permissionMode,
    ask: (question) => io.ask(question),
  });
  const log = await createSessionLog();

  printBanner({
    name: "coding-agent",
    version: loadPackageVersion(),
    model: process.env.LLM_MODEL ?? "grok-4.6",
    workspace: process.cwd(),
    permissions: permissionMode,
    tools: tools.map((tool) => tool.definition.name),
  });

  try {
    await runSession(llm, io, tools, permissions, {
      systemPrompt,
      turn,
      todos,
      log,
    });
  } finally {
    io.close();
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
