import path from "node:path";
import { fileURLToPath } from "node:url";
import { printBanner } from "./cli/banner.ts";
import { createWorkspaceFileStore } from "./file/index.ts";
import { createLlmProvider } from "./llm/index.ts";
import {
  createPermissionGate,
  loadPermissionMode,
} from "./permissions/index.ts";
import { createStdio, runSession } from "./session.ts";
import { createFileTools } from "./tools/index.ts";

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
  printBanner({
    name: "coding-agent",
    version: "1.0.0",
    model: process.env.LLM_MODEL ?? "grok-4.6",
    workspace: process.cwd(),
    permissions: permissionMode,
    tools: ["read_file", "write_file", "edit"],
  });

  const llm = createLlmProvider();
  const files = createWorkspaceFileStore();
  const tools = createFileTools(files);
  const io = createStdio();
  const permissions = createPermissionGate({
    mode: permissionMode,
    ask: (question) => io.ask(question),
  });

  try {
    await runSession(llm, io, tools, permissions);
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
