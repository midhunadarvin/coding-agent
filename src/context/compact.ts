import type { ChatMessage } from "../llm/types.ts";

export const HISTORY_CHAR_BUDGET = 80_000;
const KEEP_RECENT = 8;

export function compactHistory(
  messages: ChatMessage[],
  budget: number = HISTORY_CHAR_BUDGET,
): ChatMessage[] {
  if (measure(messages) <= budget) {
    return messages;
  }

  return messages.map((message, index) => {
    const keep = index === 0 || index >= messages.length - KEEP_RECENT;
    if (keep) {
      return message;
    }
    if (message.role === "tool" && message.content.length > 200) {
      return {
        ...message,
        content: `[compacted tool result: ${message.name ?? "tool"}]`,
      };
    }
    if (message.role === "assistant" && message.toolCalls && message.content) {
      return { ...message, content: "[compacted assistant text]" };
    }
    return message;
  });
}

function measure(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    if (message.role === "tool") {
      return total + message.content.length;
    }
    if (message.role === "assistant") {
      return total + (message.content?.length ?? 0);
    }
    return total + message.content.length;
  }, 0);
}
