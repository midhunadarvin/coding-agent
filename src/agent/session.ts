import type {
  ChatMessage,
  ChatResponse,
  LlmProvider,
  ToolDefinition,
} from "../llm/types.ts";
import { createSpinner } from "../ui/spinner.ts";
import { formatToolLabel } from "../ui/tool-status.ts";
import { compactHistory } from "./compact.ts";
import type { PermissionGate } from "./permissions/types.ts";
import type { SessionLog } from "./session-log.ts";
import { truncateOutput } from "./truncate.ts";
import {
  MUTATING_TOOLS,
  prepareToolCall,
  runPreparedTool,
  type TodoItem,
  type Tool,
  type TurnState,
} from "../tools/index.ts";
import type { InputOutput } from "./stdio.ts";

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
