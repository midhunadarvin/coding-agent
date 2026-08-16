import { printBanner } from "../ui/banner.ts";
import { createAgentFileStore, isolateFileStore, type IsolationPolicy } from "../workspace/index.ts";
import { createLlmProvider } from "../llm/index.ts";
import { createAgentTools, type TodoItem } from "../tools/index.ts";
import { loadAgentsMd } from "./agents-md.ts";
import { loadPackageVersion } from "./package-info.ts";
import { createPermissionGate, loadPermissionMode } from "./permissions/index.ts";
import { createSessionLog } from "./session-log.ts";
import { loadSkills, toSkillMeta } from "./skills.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { runSession } from "./session.ts";
import { createStdio } from "./stdio.ts";

export interface SingleAgentOptions {
  sessionName?: string;
  isolation?: IsolationPolicy;
}

export async function startSingleAgent(options: SingleAgentOptions = {}): Promise<void> {
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
  const rawFiles = createAgentFileStore();
  const files = options.isolation
    ? isolateFileStore(rawFiles, options.isolation)
    : rawFiles;
  const tools = createAgentTools({
    files,
    llm,
    skills,
    todos,
    turn,
    isolation: options.isolation,
  });
  const io = createStdio();
  const permissions = createPermissionGate({
    mode: permissionMode,
    ask: (question) => io.ask(question),
  });
  const log = await createSessionLog();
  const displayName = options.sessionName
    ? `coding-agent / ${options.sessionName}`
    : "coding-agent";

  printBanner({
    name: displayName,
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
