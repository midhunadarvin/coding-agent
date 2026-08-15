import OpenAI from "openai";
import { loadLlmConfig } from "./config.ts";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  LlmConfig,
  LlmProvider,
} from "./types.ts";

export function createLlmProvider(overrides: Partial<LlmConfig> = {}): LlmProvider {
  return new OpenAiCompatibleProvider(loadLlmConfig(overrides));
}

class OpenAiCompatibleProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: LlmConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: request.model ?? this.model,
      messages: request.messages.map(toOpenAiMessage),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: request.tools?.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error("LLM returned an empty response");
    }

    const toolCalls = (message.tool_calls ?? [])
      .filter((call) => call.type === "function")
      .map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      }));

    if (!message.content && toolCalls.length === 0) {
      throw new Error("LLM returned an empty response");
    }

    return {
      content: message.content,
      toolCalls,
      model: completion.model,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  async chatStream(
    request: ChatRequest,
    onDelta: (text: string) => void,
  ): Promise<ChatResponse> {
    const stream = await this.client.chat.completions.create({
      model: request.model ?? this.model,
      messages: request.messages.map(toOpenAiMessage),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: request.tools?.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      stream: true,
    });

    let content = "";
    let model = this.model;
    let sawTools = false;
    const assembled: Array<{ id: string; name: string; arguments: string }> = [];

    for await (const chunk of stream) {
      if (chunk.model) {
        model = chunk.model;
      }
      const delta = chunk.choices[0]?.delta;
      if (!delta) {
        continue;
      }
      if (delta.content) {
        content += delta.content;
        if (!sawTools) {
          onDelta(delta.content);
        }
      }
      for (const part of delta.tool_calls ?? []) {
        sawTools = true;
        const index = part.index ?? 0;
        const current = assembled[index] ?? { id: "", name: "", arguments: "" };
        if (part.id) {
          current.id = part.id;
        }
        if (part.function?.name) {
          current.name += part.function.name;
        }
        if (part.function?.arguments) {
          current.arguments += part.function.arguments;
        }
        assembled[index] = current;
      }
    }

    const toolCalls = assembled.filter((call) => call.name.length > 0);
    if (!content && toolCalls.length === 0) {
      throw new Error("LLM returned an empty response");
    }

    return { content: content || null, toolCalls, model };
  }
}

function toOpenAiMessage(
  message: ChatMessage,
): OpenAI.Chat.ChatCompletionMessageParam {
  if (message.role === "tool") {
    return {
      role: "tool",
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }

  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
      tool_calls: message.toolCalls?.map((call) => ({
        id: call.id,
        type: "function" as const,
        function: {
          name: call.name,
          arguments: call.arguments,
        },
      })),
    };
  }

  return {
    role: message.role,
    content: message.content,
  };
}
