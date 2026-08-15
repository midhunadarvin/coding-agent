import { createInterface, type Interface } from "node:readline/promises";
import { createSpinner } from "./cli/spinner.ts";
import { formatToolLabel } from "./cli/tool-status.ts";
import type { ChatMessage, LlmProvider } from "./llm/types.ts";
import type { PermissionGate } from "./permissions/types.ts";
import { prepareToolCall, runPreparedTool, type Tool } from "./tools/index.ts";

export interface InputOutput {
  read(): Promise<string | null>;
  ask(question: string): Promise<string | null>;
  write(output: string): void;
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
    read(): Promise<string | null> {
      return ask(interactive ? "> " : "");
    },
    ask,
    write(output: string): void {
      process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    },
    close(): void {
      rl.close();
    },
  };
}

const MAX_TOOL_ROUNDS = 20;

export async function runSession(
  llm: LlmProvider,
  io: InputOutput,
  tools: Tool[],
  permissions: PermissionGate,
): Promise<void> {
  const history: ChatMessage[] = [
    {
      role: "system",
      content:
        "You can inspect and change files in the working directory with the read_file, write_file, and edit tools. Prefer edit for partial changes.",
    },
  ];
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

    const checkpoint = history.length;
    history.push({ role: "user", content: prompt });

    try {
      await completeTurn(llm, history, io, tools, permissions, spinner);
    } catch (error) {
      spinner.stop();
      history.length = checkpoint;
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
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
): Promise<void> {
  const definitions = tools.map((tool) => tool.definition);

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    spinner.start("Waiting for model");
    let response;
    try {
      response = await llm.chat({
        messages: history,
        tools: definitions,
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
        const result = await runToolCall(call.name, call.arguments, tools, permissions, spinner);
        history.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: result,
        });
      }

      continue;
    }

    const content = response.content ?? "";
    history.push({ role: "assistant", content });
    if (content) {
      io.write(content);
    }
    return;
  }

  throw new Error(`Exceeded ${MAX_TOOL_ROUNDS} tool-call rounds`);
}

async function runToolCall(
  name: string,
  rawArguments: string,
  tools: Tool[],
  permissions: PermissionGate,
  spinner: ReturnType<typeof createSpinner>,
): Promise<string> {
  const label = formatToolLabel(name, rawArguments);
  process.stderr.write(`→ ${label}\n`);

  const prepared = prepareToolCall(tools, name, rawArguments);
  if (typeof prepared === "string") {
    process.stderr.write(`✗ ${label}\n`);
    return prepared;
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
    return message;
  }
}
