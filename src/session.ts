import { createInterface, type Interface } from "node:readline/promises";
import { createSpinner } from "./cli/spinner.ts";
import { formatToolLabel } from "./cli/tool-status.ts";
import { compactHistory } from "./context/compact.ts";
import { truncateOutput } from "./context/truncate.ts";
import type { SessionLog } from "./log/session-log.ts";
import type {
  ChatMessage,
  ChatResponse,
  LlmProvider,
  ToolDefinition,
} from "./llm/types.ts";
import type { PermissionGate } from "./permissions/types.ts";
import {
  MUTATING_TOOLS,
  prepareToolCall,
  runPreparedTool,
  type TodoItem,
  type Tool,
  type TurnState,
} from "./tools/index.ts";

export interface InputOutput {
  read(): Promise<string | null>;
  ask(question: string): Promise<string | null>;
  write(output: string): void;
  writeDelta(output: string): void;
  close(): void;
}

export function createStdio(): InputOutput {
  const interactive = Boolean(process.stdin.isTTY);
  const rl: Interface = createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: interactive,
  });
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });

  async function ask(question: string): Promise<string | null> {
    if (closed) {
      return null;
    }

    try {
      return await rl.question(question);
    } catch {
      return null;
    }
  }

  return {
    async read(): Promise<string | null> {
      if (!interactive) {
        return ask("");
      }

      const first = await ask("> ");
      if (first === null) {
        return null;
      }
      if (first.trim() === '"""') {
        const lines: string[] = [];
        for (;;) {
          const line = await ask("| ");
          if (line === null || line.trim() === '"""') {
            break;
          }
          lines.push(line);
        }
        return lines.join("\n");
      }
      if (first.endsWith("\\")) {
        const lines = [first.slice(0, -1)];
        for (;;) {
          const line = await ask("| ");
          if (line === null) {
            break;
          }
          if (!line.endsWith("\\")) {
            lines.push(line);
            break;
          }
          lines.push(line.slice(0, -1));
        }
        return lines.join("\n");
      }
      return first;
    },
    ask,
    write(output: string): void {
      process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    },
    writeDelta(output: string): void {
      process.stdout.write(output);
    },
    close(): void {
      rl.close();
    },
  };
}

const MAX_TOOL_ROUNDS = 20;
const MAX_EMPTY_RETRIES = 2;

export async function runSession(
  llm: LlmProvider,
  io: InputOutput,
  tools: Tool[],
  permissions: PermissionGate,
  options: {
    systemPrompt: string;
    turn: TurnState;
    todos: TodoItem[];
    log?: SessionLog;
  },
): Promise<void> {
  const history: ChatMessage[] = [{ role: "system", content: options.systemPrompt }];
  const spinner = createSpinner();

  for (;;) {
    const input = await io.read();
    if (input === null) {
      break;
    }

    const prompt = input.trim();
    if (!prompt) {
      continue;
    }

    options.turn.planned = false;
    const checkpoint = history.length;
    history.push({ role: "user", content: prompt });
    await options.log?.record("user", { prompt });

    try {
      await completeTurn(llm, history, io, tools, permissions, spinner, options);
    } catch (error) {
      spinner.stop();
      history.length = checkpoint;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      await options.log?.record("error", { message });
    }
  }

  spinner.stop();
}

async function completeTurn(
  llm: LlmProvider,
  history: ChatMessage[],
  io: InputOutput,
  tools: Tool[],
  permissions: PermissionGate,
  spinner: ReturnType<typeof createSpinner>,
  options: {
    turn: TurnState;
    log?: SessionLog;
  },
): Promise<void> {
  const definitions = tools.map((tool) => tool.definition);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    replaceHistory(history, compactHistory(history));
    spinner.start("Waiting for model");
    let streamed = false;
    let response: ChatResponse;
    try {
      response = await chatWithRetry(llm, history, definitions, (delta) => {
        spinner.stop();
        streamed = true;
        io.writeDelta(delta);
      });
    } finally {
      spinner.stop();
    }

    if (response.toolCalls.length > 0) {
      history.push({
        role: "assistant",
        content: response.content,
        toolCalls: response.toolCalls,
      });

      for (const call of response.toolCalls) {
        const result = await runToolCall(
          call.name,
          call.arguments,
          tools,
          permissions,
          spinner,
          options.turn,
        );
        const truncated = truncateOutput(result);
        history.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: truncated,
        });
        await options.log?.record("tool", { name: call.name, result: truncated });
      }

      continue;
    }

    const content = response.content ?? "";
    history.push({ role: "assistant", content });
    await options.log?.record("assistant", { content });
    if (content) {
      if (streamed) {
        if (!content.endsWith("\n")) {
          io.writeDelta("\n");
        }
      } else {
        io.write(content);
      }
    }
    return;
  }

  throw new Error(`Exceeded ${MAX_TOOL_ROUNDS} tool-call rounds`);
}

async function chatWithRetry(
  llm: LlmProvider,
  history: ChatMessage[],
  tools: ToolDefinition[],
  onDelta: (text: string) => void,
): Promise<ChatResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_EMPTY_RETRIES; attempt += 1) {
    try {
      return await llm.chatStream(
        {
          messages: history,
          tools,
        },
        onDelta,
      );
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("empty response") || attempt === MAX_EMPTY_RETRIES) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed");
}

async function runToolCall(
  name: string,
  rawArguments: string,
  tools: Tool[],
  permissions: PermissionGate,
  spinner: ReturnType<typeof createSpinner>,
  turn: TurnState,
): Promise<string> {
  const label = formatToolLabel(name, rawArguments);
  process.stderr.write(`→ ${label}\n`);

  const prepared = prepareToolCall(tools, name, rawArguments);
  if (typeof prepared === "string") {
    process.stderr.write(`✗ ${label}\n`);
    return prepared;
  }

  if (MUTATING_TOOLS.has(name) && !turn.planned) {
    process.stderr.write(`✗ ${label}  plan required\n`);
    return "ERROR plan\nCall submit_plan with a short plan before write_file, edit, or bash.";
  }

  const decision = await permissions.authorize({
    tool: name,
    arguments: prepared.args,
  });
  if (decision === "deny") {
    process.stderr.write(`✗ ${label}  denied\n`);
    return "Permission denied by the user.";
  }

  spinner.start(`Running ${label}`);
  try {
    const result = await runPreparedTool(prepared);
    spinner.stop(`✓ ${label}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.stop(`✗ ${label}`);
    return `ERROR ${name}\n${message}`;
  }
}

function replaceHistory(target: ChatMessage[], next: ChatMessage[]): void {
  target.length = 0;
  target.push(...next);
}
