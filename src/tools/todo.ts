import { structuredError } from "./aci.ts";
import type { Tool } from "./types.ts";

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
}

export function createTodoWriteTool(todos: TodoItem[]): Tool {
  return {
    definition: {
      name: "todo_write",
      description:
        "Replace the task checklist. Use for multi-step work. Each item needs id, content, and status.",
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                content: { type: "string" },
                status: { type: "string", enum: ["pending", "in_progress", "completed"] },
              },
              required: ["id", "content", "status"],
            },
          },
        },
        required: ["todos"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const incoming = args.todos;
      if (!Array.isArray(incoming)) {
        return structuredError("todo_write", "todos must be an array");
      }

      const next: TodoItem[] = [];
      for (const item of incoming) {
        if (!item || typeof item !== "object") {
          return structuredError("todo_write", "each todo must be an object");
        }
        const record = item as Record<string, unknown>;
        if (
          typeof record.id !== "string" ||
          typeof record.content !== "string" ||
          !isStatus(record.status)
        ) {
          return structuredError("todo_write", "each todo needs id, content, and a valid status");
        }
        next.push({
          id: record.id,
          content: record.content,
          status: record.status,
        });
      }

      todos.length = 0;
      todos.push(...next);
      if (todos.length === 0) {
        return "OK todo_write\nitems: 0";
      }
      const lines = todos.map((todo) => `- [${todo.status}] ${todo.id}: ${todo.content}`);
      return `OK todo_write\nitems: ${todos.length}\n${lines.join("\n")}`;
    },
  };
}

function isStatus(value: unknown): value is TodoStatus {
  return value === "pending" || value === "in_progress" || value === "completed";
}
