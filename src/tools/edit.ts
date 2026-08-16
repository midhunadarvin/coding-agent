import type { FileStore } from "../workspace/interface.ts";
import { structuredError } from "./aci.ts";
import { requireString } from "./args.ts";
import type { Tool } from "./types.ts";

export function createEditFileTool(files: FileStore): Tool {
  return {
    definition: {
      name: "edit",
      description:
        "Replace exactly one occurrence of text in a file. old_text must match a unique substring. Use this for partial edits instead of rewriting the whole file.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path to edit",
          },
          old_text: {
            type: "string",
            description: "Exact text to find. Must appear once in the file.",
          },
          new_text: {
            type: "string",
            description: "Replacement text. May be empty to delete the match.",
          },
        },
        required: ["path", "old_text", "new_text"],
      },
    },
    async execute(args: Record<string, unknown>): Promise<string> {
      const filePath = requireString(args, "path");
      const oldText = requireString(args, "old_text");
      const newText = requireString(args, "new_text", { allowEmpty: true });
      try {
        const current = await files.read(filePath);
        const matches = countOccurrences(current, oldText);

        if (matches === 0) {
          return structuredError("edit", "old_text was not found", { path: filePath });
        }
        if (matches > 1) {
          return structuredError(
            "edit",
            `old_text matched ${matches} times; include more surrounding context`,
            { path: filePath },
          );
        }

        await files.write(filePath, current.replace(oldText, newText));
        return `OK edit\npath: ${filePath}`;
      } catch (error) {
        return structuredError("edit", error instanceof Error ? error.message : String(error), {
          path: filePath,
        });
      }
    },
  };
}

export function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) {
      break;
    }
    count += 1;
    from = index + needle.length;
  }
  return count;
}
