import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMultiAgent } from "./agent/index.ts";

export {
  startMultiAgent,
  startSingleAgent,
  createStdio,
  runSession,
  parseCliArgs,
  prepareWorktreeSession,
  listWorktreeSessions,
  createPermissionGate,
  loadPermissionMode,
  type InputOutput,
  type PermissionDecision,
  type PermissionGate,
  type PermissionMode,
  type PermissionRequest,
} from "./agent/index.ts";
export { printBanner, renderBanner, type BannerInfo } from "./ui/index.ts";
export { createAgentFileStore, createWorkspaceFileStore, type FileStore } from "./workspace/index.ts";
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

const isDirectRun =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startMultiAgent().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
