import type { FileStore } from "../file/interface.ts";
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
      const current = await files.read(filePath);
      const matches = countOccurrences(current, oldText);

      if (matches === 0) {
        throw new Error(`old_text was not found in ${filePath}`);
      }
      if (matches > 1) {
        throw new Error(
          `old_text matched ${matches} times in ${filePath}; include more surrounding context so it matches exactly once`,
        );
      }

      await files.write(filePath, current.replace(oldText, newText));
      return `Edited ${filePath}`;
    },
  };
}

function countOccurrences(haystack: string, needle: string): number {
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
